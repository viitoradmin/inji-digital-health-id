package io.mosip.certify.services;

import io.mosip.certify.core.constants.ErrorConstants;
import io.mosip.certify.core.dto.RecordRequestDTO;
import io.mosip.certify.core.dto.RecordResponseDTO;
import io.mosip.certify.core.exception.CredentialConfigException;
import io.mosip.certify.core.exception.RecordConflictException;
import io.mosip.certify.entity.PersonRecord;
import io.mosip.certify.repository.PersonRecordRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class RecordServiceImpl implements RecordService {

    @Autowired
    private PersonRecordRepository personRecordRepository;

    @Override
    public RecordResponseDTO createRecord(RecordRequestDTO request) {
        PersonRecord record = toEntity(request);
        try {
            PersonRecord saved = personRecordRepository.save(record);
            log.info("Created record with id: {}", saved.getId());
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new RecordConflictException(ErrorConstants.RECORD_EMAIL_CONFLICT,
                    "A record with this email already exists");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public RecordResponseDTO getRecordById(String id) {
        PersonRecord record = findRecordOrThrow(id);
        return toResponse(record);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecordResponseDTO> getAllRecords() {
        return personRecordRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public RecordResponseDTO updateRecord(String id, RecordRequestDTO request) {
        PersonRecord record = findRecordOrThrow(id);
        applyRequest(record, request);
        try {
            PersonRecord saved = personRecordRepository.save(record);
            log.info("Updated record with id: {}", saved.getId());
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new RecordConflictException(ErrorConstants.RECORD_EMAIL_CONFLICT,
                    "A record with this email already exists");
        }
    }

    @Override
    public String deleteRecordById(String id) {
        PersonRecord record = findRecordOrThrow(id);
        personRecordRepository.delete(record);
        log.info("Deleted record with id: {}", id);
        return id;
    }

    private PersonRecord findRecordOrThrow(String id) {
        return personRecordRepository.findById(id)
                .orElseThrow(() -> new CredentialConfigException(
                        ErrorConstants.RECORD_NOT_FOUND,
                        "Record not found for id: " + id));
    }

    private PersonRecord toEntity(RecordRequestDTO request) {
        PersonRecord record = new PersonRecord();
        applyRequest(record, request);
        return record;
    }

    private void applyRequest(PersonRecord record, RecordRequestDTO request) {
        record.setFirstName(request.getFirstName());
        record.setLastName(request.getLastName());
        record.setDateOfBirth(request.getDateOfBirth());
        record.setGender(request.getGender());
        record.setPhoneNumber(request.getPhoneNumber());
        record.setEmail(request.getEmail());
    }

    private RecordResponseDTO toResponse(PersonRecord record) {
        RecordResponseDTO response = new RecordResponseDTO();
        response.setId(record.getId());
        response.setFirstName(record.getFirstName());
        response.setLastName(record.getLastName());
        response.setDateOfBirth(record.getDateOfBirth());
        response.setGender(record.getGender());
        response.setPhoneNumber(record.getPhoneNumber());
        response.setEmail(record.getEmail());
        response.setCreatedAt(record.getCreatedAt());
        response.setUpdatedAt(record.getUpdatedAt());
        return response;
    }
}
