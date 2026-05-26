package io.mosip.certify.controller;

import io.mosip.certify.core.dto.RecordRequestDTO;
import io.mosip.certify.core.dto.RecordResponseDTO;
import io.mosip.certify.services.RecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/records")
@Tag(name = "Records API", description = "CRUD for certify.records person identity data")
public class RecordController {

    @Autowired
    private RecordService recordService;

    @Operation(summary = "Create a person record", description = "Creates a new record with a server-generated UUID id")
    @PostMapping(produces = "application/json")
    public ResponseEntity<RecordResponseDTO> createRecord(@Valid @RequestBody RecordRequestDTO request) {
        RecordResponseDTO response = recordService.createRecord(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @Operation(summary = "Get a person record by id")
    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<RecordResponseDTO> getRecordById(@PathVariable String id) {
        RecordResponseDTO response = recordService.getRecordById(id);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @Operation(summary = "List all person records")
    @GetMapping(produces = "application/json")
    public ResponseEntity<List<RecordResponseDTO>> getAllRecords() {
        List<RecordResponseDTO> records = recordService.getAllRecords();
        return new ResponseEntity<>(records, HttpStatus.OK);
    }

    @Operation(summary = "Update a person record by id")
    @PutMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<RecordResponseDTO> updateRecord(@PathVariable String id,
                                                          @Valid @RequestBody RecordRequestDTO request) {
        RecordResponseDTO response = recordService.updateRecord(id, request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @Operation(summary = "Delete a person record by id")
    @DeleteMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<String> deleteRecordById(@PathVariable String id) {
        String deletedId = recordService.deleteRecordById(id);
        return new ResponseEntity<>("Deleted record with id: " + deletedId, HttpStatus.OK);
    }
}
