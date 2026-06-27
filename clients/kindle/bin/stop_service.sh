#!/bin/sh

# Kill any existing SlowDash service
for pid in $(ps -ef | grep "run_screensaver.sh" | grep -v grep | awk '{print $2}'); do kill -9 $pid; done

/usr/sbin/eips 2 38 "SlowDash Service Stopped      "
