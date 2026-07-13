// analytics/service/AnalyticsServiceImpl.java
package com.flhealth.analytics.service;

import com.flhealth.analytics.dto.DashboardMetricsResponse;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsServiceImpl implements AnalyticsService {

    @Override
    public DashboardMetricsResponse getMetrics() {

        DashboardMetricsResponse res = new DashboardMetricsResponse();

        res.setTotalBlogs(120L);
        res.setPublishedBlogs(80L);
        res.setDraftBlogs(40L);
        res.setAiRequests(560L);
        res.setSeoReports(210L);

        return res;
    }
}