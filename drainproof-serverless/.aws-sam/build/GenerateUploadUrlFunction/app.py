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

ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

def lambda_handler(event, context):
    try:
        report_id = event.get('pathParameters', {}).get('id')
        if not report_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing report ID in path'})
            }

        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        content_type = body.get('content_type', 'image/jpeg')
        file_extension = body.get('file_extension', 'jpg').lstrip('.')
        evidence_type = body.get('evidence_type', 'before')  # 'before' or 'after'

        if content_type not in ALLOWED_TYPES:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Unsupported file type. Allowed: {ALLOWED_TYPES}'})
            }

        object_key = f"reports/{report_id}/{evidence_type}.{file_extension}"

        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': bucket_name,
                'Key': object_key,
                'ContentType': content_type
            },
            ExpiresIn=900  # 15 minutes
        )

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'upload_url': presigned_url,
                'object_key': object_key,
                'expires_in_seconds': 900
            })
        }
    except Exception as e:
        print(f"Error generating presigned upload URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to generate upload URL', 'details': str(e)})
        }
