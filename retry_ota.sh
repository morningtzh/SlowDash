#!/bin/bash
while true; do
  echo "Running generate:ota..."
  OUTPUT=$(npm run generate:ota 2>&1)
  echo "$OUTPUT"
  if ! echo "$OUTPUT" | grep -q "ERROR"; then
    echo "Success!"
    break
  fi
  echo "Failed (found ERROR in output), retrying in 5 seconds..."
  sleep 5
done
