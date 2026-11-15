import json
import os
import boto3

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

table_name = os.environ.get('TABLE_NAME', 'DrainReports')
bucket_name = os.environ.get('BUCKET_NAME')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    report_id = event.get('report_id')
    if not report_id:
        raise ValueError("Missing report_id in workflow event")

    res = table.get_item(Key={'report_id': report_id})
    item = res.get('Item')
    if not item:
        raise ValueError(f"Report not found in DynamoDB: {report_id}")

    before_key = item.get('before_image_key')
    if not before_key:
        raise ValueError(f"Missing before_image_key for report: {report_id}")

    # Inspect S3 metadata
    s3_meta = s3_client.head_object(Bucket=bucket_name, Key=before_key)
    content_length = s3_meta.get('ContentLength', 0)

    # Reject empty files or files exceeding 10MB
    if content_length <= 0 or content_length > 10 * 1024 * 1024:
        raise ValueError(f"Invalid image file size: {content_length} bytes")

    return {
        'report_id': report_id,
        'validated': True,
        'item': item
    }
