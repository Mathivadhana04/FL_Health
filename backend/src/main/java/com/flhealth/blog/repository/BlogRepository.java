package com.flhealth.blog.repository;

import com.flhealth.blog.entity.Blog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BlogRepository extends JpaRepository<Blog, Long> {
    List<Blog> findByWorkspace(Long workspace);
}