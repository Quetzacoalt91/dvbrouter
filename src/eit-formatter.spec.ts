import EitFormatter from './eit-formatter';
import channelsList from '../tests/mocks/channels_list_E4.json';
import eitDataSimple from '../tests/mocks/EIT_simple.json';

describe("EIT Formatter", () => {
    it("creates the xml of a program for a channel", () => {
      /*
        Example: Naked Attraction
        08 Oct 2022 - 1:20am - 2:25am
      */
      const expected = `<tv generator-info-name="Dvbrouter EIT">
  <channel id="8261">
    <display-name lang="en"><![CDATA[ITV]]></display-name>
  </channel>
  <channel id="8294">
    <display-name lang="en"><![CDATA[ITV3]]></display-name>
  </channel>
  <channel id="8325">
    <display-name lang="en"><![CDATA[ITV2]]></display-name>
  </channel>
  <channel id="8330">
    <display-name lang="en"><![CDATA[ITV4]]></display-name>
  </channel>
  <channel id="8361">
    <display-name lang="en"><![CDATA[ITV +1]]></display-name>
  </channel>
  <channel id="8384">
    <display-name lang="en"><![CDATA[Channel 4]]></display-name>
  </channel>
  <channel id="8385">
    <display-name lang="en"><![CDATA[Film4]]></display-name>
  </channel>
  <channel id="8442">
    <display-name lang="en"><![CDATA[More 4]]></display-name>
  </channel>
  <channel id="8448">
    <display-name lang="en"><![CDATA[E4]]></display-name>
  </channel>
  <channel id="8452">
    <display-name lang="en"><![CDATA[Channel 4+1]]></display-name>
  </channel>
  <channel id="8458">
    <display-name lang="en"><![CDATA[E4+1]]></display-name>
  </channel>
  <channel id="8500">
    <display-name lang="en"><![CDATA[Channel 5]]></display-name>
  </channel>
  <programme start="20221008002000 +0000" stop="20221008012500 +0000" channel="8458">
    <title lang="en">
      <![CDATA[Naked Attraction]]>
    </title>
    <desc lang="en">
      <![CDATA[Having exhausted Cornwall's dating pool, Millie hopes to finally wave goodbye to laid-back surfers. And Alex the window cleaner seeks someone who'll take a shine to his fit body. (S4 Ep4)  [AD,S]]]>
    </desc>
  </programme>
</tv>`;

      const formatter = new EitFormatter(channelsList, eitDataSimple.EIT_tables);
      expect(formatter.toXml()).toEqual(expected);
    });

    it('tranforms unicode characters', () => {
      const formatter = new EitFormatter();
      const originalText = `1\/4. 4 Extra Debut. Pam is \u001cstill in the game\u001d. Poetry and sketches about getting older but not giving in. With Geoffrey Whitehead. From March 2018.`;

      expect(formatter.escapeText(originalText)).toBe("1\/4. 4 Extra Debut. Pam is &#x001c;still in the game&#x001d;. Poetry and sketches about getting older but not giving in. With Geoffrey Whitehead. From March 2018.");
    });
});
  