package io.mosip.certify.repository;

import io.mosip.certify.entity.PersonRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonRecordRepository extends JpaRepository<PersonRecord, String> {
}
