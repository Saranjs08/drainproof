import json
import os
from datetime import datetime, timezone
import boto3

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
sfn_client = boto3.client('stepfunctions')

table_name = os.environ.get('TABLE_NAME', 'DrainReports')
bucket_name = os.environ.get('BUCKET_NAME')
state_machine_arn = os.environ.get('STATE_MACHINE_ARN')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        report_id = event.get('pathParameters', {}).get('id')
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        object_key = body.get('object_key')

        if not report_id or not object_key:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'report_id and object_key are required'})
            }

        # Verify object exists in S3
        try:
            s3_client.head_object(Bucket=bucket_name, Key=object_key)
        except Exception:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Uploaded image not found in S3 bucket'})
            }

        now_utc = datetime.now(timezone.utc).isoformat()

        # Update DynamoDB with before_image_key and status SUBMITTED
        table.update_item(
            Key={'report_id': report_id},
            UpdateExpression="SET #st = :submitted, before_image_key = :key, updated_at = :now",
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={
                ':submitted': 'SUBMITTED',
                ':key': object_key,
                ':now': now_utc
            }
        )

        # Trigger Step Functions workflow
        execution_input = json.dumps({'report_id': report_id})
        sfn_response = sfn_client.start_execution(
            stateMachineArn=state_machine_arn,
            name=f"exec-{report_id}-{int(datetime.now().timestamp())}",
            input=execution_input
        )

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'message': 'Report submitted successfully. Processing workflow started.',
                'report_id': report_id,
                'execution_arn': sfn_response['executionArn'],
                'status': 'SUBMITTED'
            })
        }
    except Exception as e:
        print(f"Error submitting report: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
