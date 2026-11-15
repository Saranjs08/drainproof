def lambda_handler(event, context):
    report_id = event.get('report_id')
    item = event.get('item', {})

    severity = str(item.get('severity', 'MEDIUM')).upper()
    description = str(item.get('description', '')).lower()
    location_name = str(item.get('location_name', '')).lower()

    score = 0
    factors = []

    # 1. Severity weight
    if severity == 'HIGH':
        score += 40
        factors.append('High initial severity (+40)')
    elif severity == 'CRITICAL':
        score += 50
        factors.append('Critical severity reported (+50)')
    elif severity == 'MEDIUM':
        score += 25
        factors.append('Medium severity (+25)')
    else:
        score += 10
        factors.append('Low severity (+10)')

    # 2. Risk keyword indicators
    risk_keywords = ['flood', 'waterlogging', 'overflow', 'overflowing', 'choked', 'stagnant']
    matched_keywords = [kw for kw in risk_keywords if kw in description]
    if matched_keywords:
        score += 25
        factors.append(f'Waterlogging / flooding risk keywords: {", ".join(matched_keywords)} (+25)')

    # 3. High-traffic / critical infrastructure sensitivity
    infrastructure_keywords = ['hospital', 'school', 'market', 'station', 'bus stand', 'main road']
    matched_infra = [inf for inf in infrastructure_keywords if inf in location_name or inf in description]
    if matched_infra:
        score += 15
        factors.append(f'Proximity to critical public infrastructure ({", ".join(matched_infra)}) (+15)')

    total_score = min(score, 100)

    if total_score >= 70:
        band = 'HIGH'
    elif total_score >= 40:
        band = 'MEDIUM'
    else:
        band = 'LOW'

    return {
        'report_id': report_id,
        'item': item,
        'priority_score': total_score,
        'priority_band': band,
        'priority_factors': factors
    }
