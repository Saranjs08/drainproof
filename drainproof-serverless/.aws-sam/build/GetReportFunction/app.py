import json
import os
import boto3
from botocore.config import Config

region = os.environ.get('AWS_REGION', 'ap-south-1')
s3_client = boto3.client(
    's3',
    region_name=region,
    endpoint_url=f"https://s3.{region}.amazonaws.com",
    config=Config(signature_version='s3v4', s3={'addressing_style': 'virtual'})
)
dynamodb = boto3.resource('dynamodb')

table_name = os.environ.get('TABLE_NAME', 'DrainReports')
bucket_name = os.environ.get('BUCKET_NAME')
table = dynamodb.Table(table_name)

def generate_read_url(key):
    if not key:
        return None
    try:
        return s3_client.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': bucket_name, 'Key': key},
            ExpiresIn=3600
        )
    except Exception:
        return None

def lambda_handler(event, context):
    try:
        path_params = event.get('pathParameters') or {}
        report_id = path_params.get('id')

        # Single report lookup
        if report_id:
            res = table.get_item(Key={'report_id': report_id})
            item = res.get('Item')
            if not item:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Report not found'})
                }
            item['before_image_url'] = generate_read_url(item.get('before_image_key'))
            item['after_image_url'] = generate_read_url(item.get('after_image_key'))
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(item, default=str)
            }

        # List reports
        query_params = event.get('queryStringParameters') or {}
        status_filter = query_params.get('status')

        if status_filter:
            # Query GSI
            res = table.query(
                IndexName='StatusIndex',
                KeyConditionExpression='#st = :status_val',
                ExpressionAttributeNames={'#st': 'status'},
                ExpressionAttributeValues={':status_val': status_filter}
            )
            items = res.get('Items', [])
        else:
            res = table.scan(Limit=50)
            items = res.get('Items', [])

        for item in items:
            item['before_image_url'] = generate_read_url(item.get('before_image_key'))
            item['after_image_url'] = generate_read_url(item.get('after_image_key'))

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'reports': items}, default=str)
        }
    except Exception as e:
        print(f"Error fetching report(s): {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
