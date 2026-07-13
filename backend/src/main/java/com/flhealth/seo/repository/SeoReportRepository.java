// seo/repository/SeoReportRepository.java
package com.flhealth.seo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.flhealth.seo.entity.SeoReport;

public interface SeoReportRepository extends JpaRepository<SeoReport, Long> {
}