package com.flhealth.workspace.service;

import com.flhealth.workspace.dto.WorkspaceRequest;
import com.flhealth.workspace.dto.WorkspaceResponse;
import com.flhealth.workspace.entity.Workspace;
import com.flhealth.workspace.repository.WorkspaceRepository;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class WorkspaceServiceImpl implements WorkspaceService {

    private final WorkspaceRepository workspaceRepository;

    public WorkspaceServiceImpl(WorkspaceRepository workspaceRepository) {
        this.workspaceRepository = workspaceRepository;
    }

    private WorkspaceResponse map(Workspace w) {
        return new WorkspaceResponse(
                w.getId(),
                w.getUserId(),
                w.getName(),
                w.getDescription(),
                w.getCreatedAt(),
                w.getUpdatedAt()
        );
    }

    @Override
    public WorkspaceResponse createWorkspace(Long userId, WorkspaceRequest request) {
        Workspace w = new Workspace();
        w.setUserId(userId);
        w.setName(request.getName());
        w.setDescription(request.getDescription());
        return map(workspaceRepository.save(w));
    }

    @Override
    public WorkspaceResponse updateWorkspace(Long userId, Long workspaceId, WorkspaceRequest request) {
        Workspace w = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        if (!w.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        w.setName(request.getName());
        w.setDescription(request.getDescription());

        return map(workspaceRepository.save(w));
    }

    @Override
    public void deleteWorkspace(Long userId, Long workspaceId) {
        Workspace w = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        if (!w.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        workspaceRepository.delete(w);
    }

    @Override
    public List<WorkspaceResponse> getUserWorkspaces(Long userId) {
        return workspaceRepository.findByUserId(userId)
                .stream()
                .map(this::map)
                .collect(Collectors.toList());
    }
}