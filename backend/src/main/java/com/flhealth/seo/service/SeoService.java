// seo/service/SeoService.java
package com.flhealth.seo.service;

import com.flhealth.seo.dto.SeoRequest;
import com.flhealth.seo.dto.SeoResponse;

public interface SeoService {
    SeoResponse analyzeSeo(SeoRequest request);
}