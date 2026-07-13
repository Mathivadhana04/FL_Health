package com.flhealth.workspace.repository;

import com.flhealth.workspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    List<Workspace> findByUserId(Long userId);
}