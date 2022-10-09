import { EitDescriptor, EitEvent, EitTable } from "./types/eit";
import { ChannelsList } from "./types/mumudvb";

class EitFormatter
{
    public constructor (
        private channelsList: ChannelsList = [],
        private eventInformationTable: EitTable[] = [],
    ) {
    }

    public addEitTable (additionalEit: EitTable[]) {
        this.eventInformationTable.push(...additionalEit);
    }

    public toXml(): string {
        let xml = '<tv generator-info-name="Dvbrouter EIT">';

        // Channels
        this.channelsList.forEach((channel) => {
            xml += `
  <channel id="${channel.service_id}">
    <display-name lang="en">${channel.name}</display-name>
  </channel>`;
        });
        
        // Programs
        this.eventInformationTable.forEach((eit) => {
            eit.EIT_sections.forEach((section) => {
                section.EIT_events.forEach((event) => {
                    const progDetails = event.EIT_descriptors.find((descriptor) => descriptor.descr === 'Short event descriptor');

                    if (progDetails) {
                        const {start, stop} = this.jsonToDates(event);
                        xml += `
  <programme start="${this.dateToXML(start)}" stop="${this.dateToXML(stop)}" channel="${section.service_id}">
    <title lang="en">${progDetails.short_evt?.name}</title>
    <desc lang="en">
      <![CDATA[${progDetails.short_evt?.text}]]>
    </desc>
  </programme>`;
                    }
                });
            });
        });


        xml += `
</tv>`;

        return xml;
    }

    private jsonToDates(event: EitEvent) {
        const parsedStart = new Date(`${event["start_time day "].substring(0, 10)}T${event.start_time}`);
        // Change timezone
        const userTimezoneOffset = parsedStart.getTimezoneOffset() * 60000;
        const start = new Date(parsedStart.getTime() - userTimezoneOffset);
        const stop = new Date(start.getTime() + this.getNumberOfSecondsFromDuration(event.duration)*1000);

        return {start, stop};
    }

    private dateToXML(date: Date): string {
        const dateString = date
            .toISOString()
            .replace(/[-T:]/ig, '')
            .substring(0, 14);
        /*const offset = new Date().getTimezoneOffset();
        const timezoneString = `${
            offset<=0?'+':''
        }${
            new String(-offset/60).padStart(2, '0')
        }${
            new String(offset%60).padStart(2, '0')
        }`;*/
        const timezoneString = '+0000';

        return `${dateString} ${timezoneString}`;
    }

    private getNumberOfSecondsFromDuration(duration: string): number {
        const [hours, minutes, seconds] = duration.split(':');

        return +seconds + (+minutes * 60) + (+hours * 60 * 60);
    }
}

export default EitFormatter;
