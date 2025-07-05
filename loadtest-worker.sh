#!/bin/sh
echo "Starting load test worker"
echo "Test ID: $TEST_ID"
echo "Target URL: $TARGET_URL"
echo "Duration: $DURATION_SECONDS seconds"
echo "Requests per second: $REQUESTS_PER_SEC"
echo "HTTP Method: $HTTP_METHOD"

apk add --no-cache bc >/dev/null 2>&1

if [ -z "$DURATION_SECONDS" ] || [ -z "$REQUESTS_PER_SEC" ] || [ -z "$TARGET_URL" ]; then
    echo "Error: Missing required environment variables"
    echo "Required: DURATION_SECONDS, REQUESTS_PER_SEC, TARGET_URL"
    exit 1
fi

# Convert to integers explicitly
DURATION_SECONDS=$(printf "%.0f" "$DURATION_SECONDS" 2>/dev/null || echo 60)
REQUESTS_PER_SEC=$(printf "%.0f" "$REQUESTS_PER_SEC" 2>/dev/null || echo 1)

echo "Converted - Duration: $DURATION_SECONDS seconds, RPS: $REQUESTS_PER_SEC"

SLEEP_TIME=$(echo "scale=3; 1/$REQUESTS_PER_SEC" | bc -l)
echo "Running for $DURATION_SECONDS seconds with $SLEEP_TIME delay between requests"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_SECONDS))
COUNTER=0

build_curl_command() {
    local cmd="curl -s -w \"Status: %{http_code}, Time: %{time_total}s\\n\""
    
    if [ -n "$HTTP_METHOD" ] && [ "$HTTP_METHOD" != "GET" ]; then
        cmd="$cmd -X $HTTP_METHOD"
    fi
    
    if [ -n "$HTTP_HEADERS" ]; then
        echo "$HTTP_HEADERS" | tr ',' '\n' | while read -r header; do
            if [ -n "$header" ]; then
                cmd="$cmd -H \"$(echo "$header" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')\""
            fi
        done
    fi
    
    if [ -n "$HTTP_BODY" ]; then
        cmd="$cmd -d '$HTTP_BODY'"
    fi
    
    cmd="$cmd \"$TARGET_URL\""
    echo "$cmd"
}

while [ $(date +%s) -lt $END_TIME ]; do
    COUNTER=$((COUNTER + 1))
    echo "Request $COUNTER to $TARGET_URL"
    
    if [ -n "$HTTP_METHOD" ] && [ "$HTTP_METHOD" != "GET" ]; then
        curl -s -w "Status: %{http_code}, Time: %{time_total}s\n" -X "$HTTP_METHOD" "$TARGET_URL"
    else
        curl -s -w "Status: %{http_code}, Time: %{time_total}s\n" "$TARGET_URL"
    fi
    
    sleep $SLEEP_TIME
done

echo "Load test completed. Made $COUNTER requests."