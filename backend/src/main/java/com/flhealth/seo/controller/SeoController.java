// seo/controller/SeoController.java
package com.flhealth.seo.controller;

import org.springframework.web.bind.annotation.*;
import com.flhealth.seo.dto.SeoRequest;
import com.flhealth.seo.dto.SeoResponse;
import com.flhealth.seo.service.SeoService;

@RestController
@RequestMapping("/api/seo")
@CrossOrigin
public class SeoController {

    private final SeoService seoService;

    public SeoController(SeoService seoService) {
        this.seoService = seoService;
    }

    @PostMapping("/analyze")
    public SeoResponse analyze(@RequestBody SeoRequest request) {
        return seoService.analyzeSeo(request);
    }
}