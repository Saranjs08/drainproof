import os
import math
import boto3

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('TABLE_NAME', 'DrainReports')
table = dynamodb.Table(table_name)

def haversine_distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def lambda_handler(event, context):
    report_id = event.get('report_id')
    item = event.get('item', {})
    
    current_lat = float(item.get('latitude', 0))
    current_lon = float(item.get('longitude', 0))
    issue_type = item.get('issue_type')

    potential_duplicates = []

    try:
        # Scan recent reports (within MVP scope)
        response = table.scan(
            ProjectionExpression="report_id, latitude, longitude, issue_type, #st, created_at",
            ExpressionAttributeNames={"#st": "status"}
        )
        existing_items = response.get('Items', [])

        for other in existing_items:
            other_id = other.get('report_id')
            if other_id == report_id:
                continue

            # Only check active or recent reports
            if other.get('status') in ['RESOLVED', 'REJECTED']:
                continue

            try:
                other_lat = float(other.get('latitude', 0))
                other_lon = float(other.get('longitude', 0))
                dist = haversine_distance_km(current_lat, current_lon, other_lat, other_lon)

                # Within 300 meters and matching issue type
                if dist <= 0.300 and other.get('issue_type') == issue_type:
                    potential_duplicates.append({
                        'report_id': other_id,
                        'distance_meters': round(dist * 1000, 1),
                        'created_at': other.get('created_at')
                    })
            except (ValueError, TypeError):
                continue
    except Exception as e:
        print(f"Warning during duplicate detection: {str(e)}")

    event['possible_duplicate_ids'] = [d['report_id'] for d in potential_duplicates]
    event['duplicate_details'] = potential_duplicates
    return event
