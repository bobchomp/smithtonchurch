import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Our Vision",
  description:
    "The vision and mission of Smithton Church, Inverness – knowing Jesus and making Jesus known – for our eldership, congregation, community and city.",
};

export default function OurVision() {
  return (
    <>
      <PageBanner title="Our Vision" />

      <section className="section">
        <div className="container narrow prose vision">
          <h2>Our vision</h2>
          <p>
            A few years ago, the leaders of the congregation embarked on a process to think biblically and
            strategically about who we are and why we exist as a congregation. Two key features became clear: our
            vision is to resource Christians and to reach out to our community and city with the gospel. These aims
            are captured in the strapline:
          </p>
          <p className="vision-strapline">Knowing Jesus and making Jesus known</p>

          <h2>Our mission</h2>
          <p>
            To see this become a reality, the eldership examined what this vision means for the leadership, the
            congregation, the community and city.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container narrow prose vision">
          <h2>The eldership</h2>
          <p>
            The elders set the culture of the congregation. Rarely will a congregation advance beyond the spirituality
            and leadership shown by its leaders. As an eldership, we commit to be an open, accessible and approachable
            leadership who will be known for our care for the congregation individually and collectively. Sensing our
            own need of prayer and having already implemented a system of prayer triplets or quads in the eldership, we
            will encourage each follower of Jesus to be involved in a small group where prayer is included.
          </p>

          <h2>The congregation</h2>
          <p>
            On the radar of the eldership are ways of encouraging our individual, family and congregational
            devotional life. Paul wanted to ‘know Christ better’ (Philippians 3:10). So do we. Whether through
            sourcing devotional aids or sharing helpful resources, we want to help you know Jesus better.
          </p>
          <p>
            Family worship helps, guidance for parenting at different ages, and linking the teaching in church youth
            ministry with what is taught at home, are all key components to how we intend to encourage families.
          </p>
          <p>
            Being together to worship, pray, care and learn is commanded (Hebrews 10:25) and crucial for our growth.
            We want to ensure our congregational worship is God-focused, Holy Spirit-led and Christ-exalting. This
            involves personal preparation and prayerful expectation.
          </p>
          <p>
            One aspiration we have is to connect everyone (where possible) with a weekday Community Group as a place
            to learn, a place to care and a place to share the gospel locally.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container narrow prose vision">
          <h2>Our community &amp; city</h2>
          <p>
            Over 15,000 people living in the eastern part of the city have no connection to a church. With proposed
            developments at Stratton and Ashton, that figure will increase significantly. Reaching our community, city
            and beyond is part of the reason for our existence.
          </p>
          <p>
            One of the best ways of reaching new people is to plant new churches. We will actively look for God-given
            opportunities to plant churches within unreached communities, including the new developments on the east
            side of Inverness. In January 2023, we launched our first plant, Tornagrain Community Church. In 2025, it
            became a fully-fledged congregation in its own right. What comes next?
          </p>
          <p>
            Alongside planting churches, we want to equip our members to have answers to the questions people are
            asking today about life, faith, truth and hope.
          </p>
          <p>We will also introduce regular guest services and events to invite new people along.</p>

          <h2>What can you do?</h2>
          <p>
            Everything, from developing existing relationships and contacts from the regular weekly ministries to
            engaging users of the buildings and planting new churches, must be grounded in prayerful dependence on God.
            Please join us as we pray for the lost.
          </p>

          <div className="callout">
            <h3>Need to get in touch?</h3>
            <p>
              The church office is open {site.office_hours}. To help manage the office workflow, we would appreciate
              that any visits outwith these hours are made by prior appointment. Thank you!
            </p>
            <p>
              Email <a href={`mailto:${site.email}`}>{site.email}</a> or call{" "}
              <a href={`tel:${site.phone_link}`}>{site.phone}</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
