import json
import os
from datetime import datetime, timezone
import boto3

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

table_name = os.environ.get('TABLE_NAME', 'DrainReports')
bucket_name = os.environ.get('BUCKET_NAME')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        report_id = event.get('pathParameters', {}).get('id')
        raw_path = event.get('rawPath', '') or event.get('requestContext', {}).get('http', {}).get('path', '')
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        now_utc = datetime.now(timezone.utc).isoformat()

        if not report_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing report_id'})
            }

        # Submitting Resolution Evidence (After Image)
        if 'verify-resolution' not in raw_path:
            after_image_key = body.get('after_image_key')
            notes = body.get('resolution_notes', '')

            if not after_image_key:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'after_image_key is required'})
                }

            # Verify image exists in S3
            try:
                s3_client.head_object(Bucket=bucket_name, Key=after_image_key)
            except Exception:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'After image file not found in S3'})
                }

            table.update_item(
                Key={'report_id': report_id},
                UpdateExpression="""
                    SET after_image_key = :key,
                        resolution_notes = :notes,
                        #st = :status,
                        updated_at = :now
                """,
                ExpressionAttributeNames={'#st': 'status'},
                ExpressionAttributeValues={
                    ':key': after_image_key,
                    ':notes': notes,
                    ':status': 'RESOLUTION_PENDING_VERIFICATION',
                    ':now': now_utc
                }
            )

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message': 'Resolution evidence submitted. Awaiting administrator verification.',
                    'report_id': report_id,
                    'status': 'RESOLUTION_PENDING_VERIFICATION'
                })
            }

        # Admin Resolution Verification (Approve / Reject)
        decision = body.get('decision', 'APPROVE').upper()  # 'APPROVE' or 'REJECT'
        verified_by = body.get('verified_by', 'admin_reviewer')
        admin_feedback = body.get('feedback', '')

        if decision == 'APPROVE':
            new_status = 'RESOLVED'
            table.update_item(
                Key={'report_id': report_id},
                UpdateExpression="""
                    SET #st = :status,
                        verified_by = :vby,
                        verification_feedback = :fb,
                        resolved_at = :now,
                        updated_at = :now
                """,
                ExpressionAttributeNames={'#st': 'status'},
                ExpressionAttributeValues={
                    ':status': new_status,
                    ':vby': verified_by,
                    ':fb': admin_feedback,
                    ':now': now_utc
                }
            )
        else:
            new_status = 'NEEDS_MORE_EVIDENCE'
            table.update_item(
                Key={'report_id': report_id},
                UpdateExpression="""
                    SET #st = :status,
                        verified_by = :vby,
                        verification_feedback = :fb,
                        updated_at = :now
                """,
                ExpressionAttributeNames={'#st': 'status'},
                ExpressionAttributeValues={
                    ':status': new_status,
                    ':vby': verified_by,
                    ':fb': admin_feedback,
                    ':now': now_utc
                }
            )

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'message': f'Resolution verification processed: {new_status}',
                'report_id': report_id,
                'status': new_status,
                'verified_by': verified_by
            })
        }
    except Exception as e:
        print(f"Error handling resolution: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
