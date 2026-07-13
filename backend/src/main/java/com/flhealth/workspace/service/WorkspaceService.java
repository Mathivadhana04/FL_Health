package com.flhealth.workspace.service;

import com.flhealth.workspace.dto.WorkspaceRequest;
import com.flhealth.workspace.dto.WorkspaceResponse;

import java.util.List;

public interface WorkspaceService {

    WorkspaceResponse createWorkspace(Long userId, WorkspaceRequest request);

    WorkspaceResponse updateWorkspace(Long userId, Long workspaceId, WorkspaceRequest request);

    void deleteWorkspace(Long userId, Long workspaceId);

    List<WorkspaceResponse> getUserWorkspaces(Long userId);
}