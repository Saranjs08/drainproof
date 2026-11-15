import json
import os
import uuid
from datetime import datetime, timezone
import boto3

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('TABLE_NAME', 'DrainReports')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        
        # Validation of required fields
        required_fields = ['issue_type', 'description', 'latitude', 'longitude']
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }

        report_id = f"DRN-{uuid.uuid4().hex[:8].upper()}"
        now_utc = datetime.now(timezone.utc).isoformat()

        item = {
            'report_id': report_id,
            'issue_type': body['issue_type'],
            'description': body['description'],
            'location_name': body.get('location_name', 'Unknown Location'),
            'latitude': str(body['latitude']),
            'longitude': str(body['longitude']),
            'severity': body.get('severity', 'MEDIUM').upper(),
            'status': 'DRAFT',
            'priority_score': 0,
            'priority_band': 'PENDING',
            'before_image_key': None,
            'after_image_key': None,
            'possible_duplicate_ids': [],
            'created_at': now_utc,
            'updated_at': now_utc,
            'resolved_at': None,
            'verified_by': None
        }

        table.put_item(Item=item)

        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'message': 'Report draft created successfully',
                'report_id': report_id,
                'status': 'DRAFT'
            })
        }
    except Exception as e:
        print(f"Error creating report: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
