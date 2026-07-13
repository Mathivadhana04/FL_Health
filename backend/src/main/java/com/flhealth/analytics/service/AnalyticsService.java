// analytics/service/AnalyticsService.java
package com.flhealth.analytics.service;

import com.flhealth.analytics.dto.DashboardMetricsResponse;

public interface AnalyticsService {
    DashboardMetricsResponse getMetrics();
}