package io.mosip.certify.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.mosip.certify.core.dto.ParsedAccessToken;
import io.mosip.certify.core.dto.RecordRequestDTO;
import io.mosip.certify.core.dto.RecordResponseDTO;
import io.mosip.certify.services.RecordService;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RunWith(SpringRunner.class)
@WebMvcTest(value = RecordController.class)
public class RecordControllerTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ParsedAccessToken parsedAccessToken;

    @MockBean
    private RecordService recordService;

    private RecordRequestDTO recordRequestDTO;
    private RecordResponseDTO recordResponseDTO;

    @Before
    public void setup() {
        recordRequestDTO = new RecordRequestDTO();
        recordRequestDTO.setFirstName("Shailesh");
        recordRequestDTO.setLastName("Gojiya");
        recordRequestDTO.setDateOfBirth(LocalDate.of(1990, 5, 15));
        recordRequestDTO.setGender("Male");
        recordRequestDTO.setPhoneNumber("+919876543210");
        recordRequestDTO.setEmail("shailesh@example.com");

        recordResponseDTO = new RecordResponseDTO();
        recordResponseDTO.setId("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
        recordResponseDTO.setFirstName(recordRequestDTO.getFirstName());
        recordResponseDTO.setLastName(recordRequestDTO.getLastName());
        recordResponseDTO.setDateOfBirth(recordRequestDTO.getDateOfBirth());
        recordResponseDTO.setGender(recordRequestDTO.getGender());
        recordResponseDTO.setPhoneNumber(recordRequestDTO.getPhoneNumber());
        recordResponseDTO.setEmail(recordRequestDTO.getEmail());
        recordResponseDTO.setCreatedAt(LocalDateTime.now());
        recordResponseDTO.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    public void createRecord_Success() throws Exception {
        Mockito.when(recordService.createRecord(Mockito.any(RecordRequestDTO.class))).thenReturn(recordResponseDTO);

        mockMvc.perform(post("/records")
                        .content(objectMapper.writeValueAsBytes(recordRequestDTO))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(recordResponseDTO.getId()))
                .andExpect(jsonPath("$.firstName").value("Shailesh"))
                .andExpect(jsonPath("$.lastName").value("Gojiya"));
    }

    @Test
    public void getRecordById_Success() throws Exception {
        Mockito.when(recordService.getRecordById(Mockito.anyString())).thenReturn(recordResponseDTO);

        mockMvc.perform(get("/records/" + recordResponseDTO.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(recordResponseDTO.getId()))
                .andExpect(jsonPath("$.email").value("shailesh@example.com"));
    }

    @Test
    public void getAllRecords_Success() throws Exception {
        Mockito.when(recordService.getAllRecords()).thenReturn(List.of(recordResponseDTO));

        mockMvc.perform(get("/records"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(recordResponseDTO.getId()));
    }

    @Test
    public void updateRecord_Success() throws Exception {
        Mockito.when(recordService.updateRecord(eq(recordResponseDTO.getId()), eq(recordRequestDTO)))
                .thenReturn(recordResponseDTO);

        mockMvc.perform(put("/records/" + recordResponseDTO.getId())
                        .content(objectMapper.writeValueAsBytes(recordRequestDTO))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(recordResponseDTO.getId()));
    }

    @Test
    public void deleteRecord_Success() throws Exception {
        Mockito.when(recordService.deleteRecordById(recordResponseDTO.getId())).thenReturn(recordResponseDTO.getId());

        mockMvc.perform(delete("/records/" + recordResponseDTO.getId()))
                .andExpect(status().isOk())
                .andExpect(content().string("Deleted record with id: " + recordResponseDTO.getId()));
    }
}
