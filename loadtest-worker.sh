#!/bin/sh
echo "Starting load test worker"
echo "Test ID: $TEST_ID"
echo "Target URL: $TARGET_URL"
echo "Duration: $DURATION_SECONDS seconds"
echo "Requests per second: $REQUESTS_PER_SEC"
echo "HTTP Method: $HTTP_METHOD"
echo "HTTP Headers: $(echo "$HTTP_HEADERS" | tr '\n' ' ')"  
echo "HTTP Body: $HTTP_BODY"

apk add --no-cache bc jq >/dev/null 2>&1

if [ -z "$DURATION_SECONDS" ] || [ -z "$REQUESTS_PER_SEC" ] || [ -z "$TARGET_URL" ]; then
    echo "Error: Missing required environment variables"
    echo "Required: DURATION_SECONDS, REQUESTS_PER_SEC, TARGET_URL"
    exit 1
fi

DURATION_SECONDS=$(printf "%.0f" "$DURATION_SECONDS" 2>/dev/null || echo 60)
REQUESTS_PER_SEC=$(printf "%.0f" "$REQUESTS_PER_SEC" 2>/dev/null || echo 1)

echo "Converted - Duration: $DURATION_SECONDS seconds, RPS: $REQUESTS_PER_SEC"

SLEEP_TIME=$(echo "scale=3; 1/$REQUESTS_PER_SEC" | bc -l)
echo "Running for $DURATION_SECONDS seconds with $SLEEP_TIME delay between requests"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_SECONDS))
COUNTER=0
SUCCESS_COUNT=0
ERROR_COUNT=0
TOTAL_RESPONSE_TIME=0
MIN_RESPONSE_TIME=""
MAX_RESPONSE_TIME=0

STATUS_200=0
STATUS_400=0
STATUS_500=0
STATUS_OTHER=0

METRICS_FILE="/tmp/metrics-$TEST_ID.json"

log_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local current_time=$(date +%s)
    local elapsed=$((current_time - START_TIME))

    local avg_response_time="0.000"
    local error_rate="0.00"
    local rps="0.00"

    if [ $COUNTER -gt 0 ]; then
        avg_response_time=$(echo "scale=3; $TOTAL_RESPONSE_TIME/$COUNTER" | bc -l | awk '{printf "%0.3f", $0}')
        error_rate=$(echo "scale=2; ($ERROR_COUNT * 100)/$COUNTER" | bc -l | awk '{printf "%0.2f", $0}')
        rps=$(echo "scale=2; $COUNTER/$elapsed" | bc -l | awk '{printf "%0.2f", $0}')
    fi

    cat > "$METRICS_FILE" << EOF
{
    "test_id": "$TEST_ID",
    "timestamp": "$timestamp",
    "elapsed_seconds": $elapsed,
    "total_requests": $COUNTER,
    "successful_requests": $SUCCESS_COUNT,
    "failed_requests": $ERROR_COUNT,
    "avg_response_time": $avg_response_time,
    "min_response_time": $MIN_RESPONSE_TIME,
    "max_response_time": $MAX_RESPONSE_TIME,
    "error_rate": $error_rate,
    "status_codes": {
        "200": $STATUS_200,
        "400": $STATUS_400,
        "500": $STATUS_500,
        "other": $STATUS_OTHER
    },
    "requests_per_second": $rps
}
EOF

    if [ -s "$METRICS_FILE" ]; then
        echo "METRICS: $(cat "$METRICS_FILE")"
    fi
}

HEADER_ARGS=()
if [ -n "$HTTP_HEADERS" ]; then
    IFS=$'\n'
    for header in $(echo "$HTTP_HEADERS"); do
        HEADER_ARGS+=("-H" "$header")
    done
    unset IFS
fi

while [ $(date +%s) -lt $END_TIME ]; do
    COUNTER=$((COUNTER + 1))

    if [ -n "$HTTP_METHOD" ] && [ "$HTTP_METHOD" != "GET" ]; then
        if [ -n "$HTTP_BODY" ]; then
            RESPONSE=$(curl -s -w "%{http_code},%{time_total}" -X "$HTTP_METHOD" "${HEADER_ARGS[@]}" -d "$HTTP_BODY" "$TARGET_URL" -o /dev/null)
        else
            RESPONSE=$(curl -s -w "%{http_code},%{time_total}" -X "$HTTP_METHOD" "${HEADER_ARGS[@]}" "$TARGET_URL" -o /dev/null)
        fi
    else
        RESPONSE=$(curl -s -w "%{http_code},%{time_total}" "${HEADER_ARGS[@]}" "$TARGET_URL" -o /dev/null)
    fi

    STATUS_CODE=$(echo "$RESPONSE" | cut -d',' -f1)
    RESPONSE_TIME=$(echo "$RESPONSE" | cut -d',' -f2)

    echo "Request $COUNTER: Status $STATUS_CODE, Time ${RESPONSE_TIME}s"

    if [ "$STATUS_CODE" -ge 200 ] && [ "$STATUS_CODE" -lt 300 ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi

    case "$STATUS_CODE" in
        200) STATUS_200=$((STATUS_200 + 1)) ;;
        4*) STATUS_400=$((STATUS_400 + 1)) ;;
        5*) STATUS_500=$((STATUS_500 + 1)) ;;
        *) STATUS_OTHER=$((STATUS_OTHER + 1)) ;;
    esac

    TOTAL_RESPONSE_TIME=$(echo "$TOTAL_RESPONSE_TIME + $RESPONSE_TIME" | bc -l)

    if [ -z "$MIN_RESPONSE_TIME" ] || [ $(echo "$RESPONSE_TIME < $MIN_RESPONSE_TIME" | bc -l) -eq 1 ]; then
        MIN_RESPONSE_TIME=$RESPONSE_TIME
    fi

    if [ $(echo "$RESPONSE_TIME > $MAX_RESPONSE_TIME" | bc -l) -eq 1 ]; then
        MAX_RESPONSE_TIME=$RESPONSE_TIME
    fi

    if [ $((COUNTER % 10)) -eq 0 ]; then
        log_metrics
    fi

    sleep $SLEEP_TIME
done

log_metrics

echo "Load test completed. Made $COUNTER requests."
echo "Final metrics saved to $METRICS_FILE"
