package io.mosip.certify.services;

import io.mosip.certify.core.dto.RecordRequestDTO;
import io.mosip.certify.core.dto.RecordResponseDTO;

import java.util.List;

public interface RecordService {

    RecordResponseDTO createRecord(RecordRequestDTO request);

    RecordResponseDTO getRecordById(String id);

    List<RecordResponseDTO> getAllRecords();

    RecordResponseDTO updateRecord(String id, RecordRequestDTO request);

    String deleteRecordById(String id);
}
