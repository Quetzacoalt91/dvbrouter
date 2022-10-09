export type EitTables = {
    EIT_tables: EitTable[]
};

export type EitTable = {
    sid: string,
    table_id: number,
    version:number,
    last_section_number: number,
    EIT_sections: EitSection[],
}

export type EitSection = {
    number: number,
    service_id: number,
    // [...]
    EIT_events: EitEvent[],
}

export type EitEvent = {
    event_id: number,
    'start_time day ': string, // "2022-10-08 (yy-mm-dd)"
    start_time: string, // "01:25:00"
    duration: string, // "01:00:00"
    // [...]
    EIT_descriptors: EitDescriptor[],
}

export type EitDescriptor = {
    tag: number,
    len: number,
    descr: string,
    short_evt?: {
        language: string,
        name: string,
        text: string,
    },
}