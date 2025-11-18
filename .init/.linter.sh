#!/bin/bash
cd /home/kavia/workspace/code-generation/enterprise-metrics-dashboard-42611-42620/enterprise_dashboard_frontend
npx eslint
ESLINT_EXIT_CODE=$?
npm run build
BUILD_EXIT_CODE=$?
if [ $ESLINT_EXIT_CODE -ne 0 ] || [ $BUILD_EXIT_CODE -ne 0 ]; then
   exit 1
fi

