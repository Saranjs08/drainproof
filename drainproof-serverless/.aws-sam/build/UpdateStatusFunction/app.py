import json
import os
from datetime import datetime, timezone
import boto3

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('TABLE_NAME', 'DrainReports')
table = dynamodb.Table(table_name)

ALLOWED_TRANSITIONS = {
    'SUBMITTED': ['UNDER_REVIEW', 'REJECTED'],
    'UNDER_REVIEW': ['IN_PROGRESS', 'REJECTED'],
    'IN_PROGRESS': ['RESOLUTION_PENDING_VERIFICATION'],
    'RESOLUTION_PENDING_VERIFICATION': ['RESOLVED', 'NEEDS_MORE_EVIDENCE', 'IN_PROGRESS'],
    'NEEDS_MORE_EVIDENCE': ['RESOLUTION_PENDING_VERIFICATION', 'IN_PROGRESS']
}

def lambda_handler(event, context):
    now_utc = datetime.now(timezone.utc).isoformat()

    # Case A: Invocation from Step Functions workflow
    if 'priority_score' in event and 'report_id' in event:
        report_id = event['report_id']
        priority_score = event.get('priority_score', 0)
        priority_band = event.get('priority_band', 'LOW')
        priority_factors = event.get('priority_factors', [])
        duplicates = event.get('possible_duplicate_ids', [])

        table.update_item(
            Key={'report_id': report_id},
            UpdateExpression="""
                SET priority_score = :ps,
                    priority_band = :pb,
                    priority_factors = :pf,
                    possible_duplicate_ids = :dup,
                    #st = :status,
                    updated_at = :now
            """,
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={
                ':ps': priority_score,
                ':pb': priority_band,
                ':pf': priority_factors,
                ':dup': duplicates,
                ':status': 'UNDER_REVIEW',
                ':now': now_utc
            }
        )
        return {'status': 'SUCCESS', 'report_id': report_id}

    # Case B: HTTP API Call (PATCH /reports/{id}/status)
    try:
        report_id = event.get('pathParameters', {}).get('id')
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        new_status = body.get('status')
        note = body.get('note', '')

        if not report_id or not new_status:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing report_id or target status'})
            }

        curr = table.get_item(Key={'report_id': report_id}).get('Item')
        if not curr:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Report not found'})
            }

        current_status = curr.get('status', 'DRAFT')
        allowed = ALLOWED_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Invalid transition from {current_status} to {new_status}. Allowed: {allowed}'})
            }

        table.update_item(
            Key={'report_id': report_id},
            UpdateExpression="SET #st = :st, admin_note = :note, updated_at = :now",
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={
                ':st': new_status,
                ':note': note,
                ':now': now_utc
            }
        )

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'message': f'Status updated to {new_status}',
                'report_id': report_id,
                'status': new_status
            })
        }
    except Exception as e:
        print(f"Error in update_status: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
