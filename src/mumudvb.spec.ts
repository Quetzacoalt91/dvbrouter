import { expect } from "@jest/globals";
import { filterChannelsWithClients } from "./mumudvb";
import channelsListMock from "../tests/mocks/channels-list.json";

describe("MumuDVB Adapter", () => {
  it("finds channel with client", () => {

    const result = filterChannelsWithClients(channelsListMock);

    expect(result).toEqual([
      {
        number: 7,
        lcn: 201,
        name: "CBBC",
        sap_group: "",
        ip_multicast: "0.0.0.0",
        port_multicast: 1234,
        num_clients: 0,
        ratio_scrambled: 0,
        is_up: 1,
        pcr_pid: 301,
        pmt_version: 4,
        unicast_port: 0,
        service_id: 4608,
        service_type: "Television",
        pids_num: 5,
        pids: [
          {
            number: 700,
            type: "PMT",
            language: "---",
          },
          {
            number: 301,
            type: "Video (MPEG2)",
            language: "---",
          },
          {
            number: 302,
            type: "Audio (MPEG1)",
            language: "eng",
          },
          {
            number: 306,
            type: "Audio (MPEG1)",
            language: "eng",
          },
          {
            number: 305,
            type: "Subtitling",
            language: "eng",
          },
        ],
        clients: [
          {
            client_number: 0,
            socket: 13,
            remote_address: "192.168.50.201",
            remote_port: 28315,
            buffer_size: 0,
            consecutive_errors: 0,
            first_error_time: 0,
            last_error_time: 0,
          },
          {},
        ],
      },
    ]);
  });
});
