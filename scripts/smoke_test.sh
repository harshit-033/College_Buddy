#!/usr/bin/env bash
# ==============================================================================
# CampusIQ / CollegeBuddy — API Smoke Test Script
# Usage: ./scripts/smoke_test.sh [TARGET_URL]
# Example: ./scripts/smoke_test.sh https://api.yourdomain.com
# ==============================================================================

set -euo pipefail

TARGET_URL="${1:-http://localhost:8000}"
TARGET_URL="${TARGET_URL%/}"

echo "=========================================="
echo "Running smoke test on: ${TARGET_URL}"
echo "=========================================="

# 1. Test Root Endpoint
echo -n "1. Checking GET / ... "
ROOT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}/")
if [[ "${ROOT_RESPONSE}" == "200" ]]; then
    echo "PASS (HTTP 200)"
else
    echo "FAIL (HTTP ${ROOT_RESPONSE})"
    exit 1
fi

# 2. Test Health Endpoint
echo -n "2. Checking GET /health ... "
HEALTH_BODY=$(curl -s "${TARGET_URL}/health")
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}/health")

if [[ "${HEALTH_CODE}" == "200" ]] && [[ "${HEALTH_BODY}" == *"\"status\":\"ok\""* ]] && [[ "${HEALTH_BODY}" == *"\"database\":\"ok\""* ]]; then
    echo "PASS (HTTP 200, Body: ${HEALTH_BODY})"
else
    echo "FAIL (HTTP ${HEALTH_CODE}, Body: ${HEALTH_BODY})"
    exit 1
fi

echo "=========================================="
echo "All smoke tests PASSED successfully!"
echo "=========================================="
exit 0
