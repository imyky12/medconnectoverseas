import { SiteContent, SiteSetting } from '../models/SiteContent.model';

/**
 * Moves the content that used to be hardcoded in the React components into the
 * database, once, on an empty install.
 *
 * Same rule as the policy seed: it does nothing if the section already has rows.
 * The database is the source of truth after the first boot, so re-seeding would
 * quietly undo the admin's edits on the next restart.
 *
 * **The testimonials seeded here are the ones that were already on the site.**
 * They are placeholders with invented names — see the note beside them. They are
 * carried over so the page does not go blank, and so an admin has something to
 * edit rather than an empty screen, but they should be replaced with real
 * quotes or removed before launch.
 */

const TESTIMONIALS = [
  ['Aisha S.', '3rd Year Medical Student', 'The study sessions organized by MCO have significantly improved my academic performance. The community is supportive and the resources are invaluable.'],
  ['Michael K.', '2nd Year Medical Student', 'The trekking adventures were not just fun but also helped me build meaningful connections with fellow students. MCO truly cares about our well-being.'],
  ['Leila P.', '4th Year Medical Student', "The Med Talks provided me with insights from experienced professionals that I couldn't get elsewhere. MCO has been instrumental in my medical education journey."],
  ['David R.', '1st Year Medical Student', 'As a first-year student, I was overwhelmed until I joined MCO. Their guidance and community support made my transition into medical school much smoother.'],
  ['Sarah T.', 'Final Year Medical Student', 'MCO helped me prepare for my licensing exams with resources and study groups I would not have found on my own.'],
  ['James L.', '2nd Year Medical Student', 'The webinars are practical and to the point. I have used something from almost every one of them.'],
  ['Emma W.', '3rd Year Medical Student', 'Being part of MCO connected me with students in other countries facing exactly the same questions I was.'],
];

/** These are real figures from events already run — confirmed by the owner. */
const STATS: [string, number, string][] = [
  ['Workshops', 50, '+'],
  ['Speakers', 10, '+'],
  ['Participants', 100, '+'],
  ['Countries', 3, ''],
  ['Success Stories', 100, '+'],
  ['Monthly Events', 12, ''],
];

const FAQS = [
  ['What is MedConnectsOverseas?', 'MedConnectsOverseas (MCO) is a student-led, student-oriented community that connects medical students worldwide. We provide resources, organize activities, and foster a supportive environment for academic and personal growth.'],
  ['How can I join MedConnectsOverseas?', "You can join our community by clicking the 'Join Us' button on our website and filling out the registration form. Membership is free for all medical students."],
  ['What activities does MCO organize?', 'We organize study sessions, Med Talks, free webinars, trekking adventures, treasure hunts and cultural trips — a mix of academic and social activities.'],
  ['Is there a membership fee?', 'Membership is free. Some individual events and workshops carry a fee, which is always shown before you book.'],
  ['Do I need to be studying abroad already?', 'No. Many of our members are still deciding where to apply, and a lot of what we run is aimed exactly at that stage.'],
];

const FOUNDERS = [
  {
    heading: 'Astha Singh Sengar',
    subheading: 'Co-Founder & CTO',
    body: 'Astha founded MedConnectsOverseas with a vision to make studying medicine abroad transparent and reachable for students who have no one to ask.',
    imageUrl: '/images/founder.png',
    linkedinUrl: 'https://www.linkedin.com/in/astha-sengar-4704b3320',
    email: 'ashta.sengar@medconnectsoverseas.com',
  },
  {
    heading: 'Bhavy Gaba',
    subheading: 'Co-Founder & CEO',
    body: 'Bhavy leads the community and partnerships behind MCO, building the events and mentorship that connect students across borders.',
    imageUrl: '/images/founder2.png',
    linkedinUrl: 'https://www.linkedin.com/in/bhavy-gaba-713a94327',
    email: 'bhavygaba@medconnectsoverseas.com',
  },
];

const ACTIVITIES = [
  ['Exploring Georgia', 'Discover the beautiful landscapes and rich culture of Georgia with fellow medical students.', '/images/exploring-georgia.jpg'],
  ['Treasure Hunt', 'Engage in exciting treasure hunt competitions that combine fun with medical knowledge.', '/images/treasure-hunt.jpg'],
  ['Trekking Adventures', 'Join our trekking expeditions to promote physical well-being and build lasting connections.', '/images/trekking.jpg'],
  ['Med Talks', 'Attend insightful talks by medical professionals and experts in various healthcare fields.', '/images/med-talks.jpg'],
  ['Free Webinars', 'Participate in our free educational webinars covering diverse medical topics and career guidance.', '/images/webinars.jpg'],
  ['Study Sessions', 'Join collaborative study sessions designed to enhance academic performance and knowledge sharing.', '/images/study-sessions.jpg'],
];

const SETTINGS: [string, string][] = [
  ['mission.summary', 'Transparency, guidance, and opportunities for medical students worldwide.'],
  ['mission.points', [
    'Provide clear, honest guidance to medical students',
    'Connect students with opportunities across borders',
    'Build a community that supports academic and personal growth',
  ].join('\n')],
  ['vision.summary', 'A world where medical students thrive academically, mentally, and socially.'],
  ['vision.points', [
    'Academic excellence through collaborative learning',
    'Mental well-being supported by a community that understands',
    'Careers built on real information rather than guesswork',
  ].join('\n')],

  /**
   * How to reach us, and where we are.
   *
   * The phone number that used to sit on the contact page was the placeholder
   * `+1 (123) 456-7890`, which is worse than no number at all. It is seeded
   * blank instead: the contact page and the footer draw nothing for a blank
   * value, so nobody is given a number that does not ring until an admin puts a
   * real one in.
   */
  ['contact.email', 'info@medconnectsoverseas.com'],
  ['contact.phone', ''],
  ['contact.location', 'Tbilisi, Georgia'],

  /**
   * Social profiles, one setting per network. Blank means the icon is not
   * shown — an icon that goes nowhere reads as an unfinished site. Instagram is
   * the one account that exists today; it was previously hardcoded in
   * `src/constants/social.ts`.
   */
  ['social.instagram', 'https://www.instagram.com/medconnectsoverseas'],
  ['social.linkedin', ''],
  ['social.twitter', ''],
  ['social.facebook', ''],
  ['social.youtube', ''],
  ['social.telegram', ''],
  ['social.whatsapp', ''],
];

export async function seedSiteContent(): Promise<void> {
  const seedSection = async (section: string, rows: Record<string, unknown>[]) => {
    if (await SiteContent.exists({ section })) return;
    await SiteContent.insertMany(
      rows.map((row, i) => ({ ...row, section, order: i + 1, isPublished: true, createdByName: 'System (initial import)' }))
    );
    console.log(`🌱 Seeded ${rows.length} ${section}(s)`);
  };

  await seedSection('testimonial', TESTIMONIALS.map(([heading, subheading, body]) => ({ heading, subheading, body })));
  await seedSection('stat', STATS.map(([heading, value, suffix]) => ({ heading, value, suffix })));
  await seedSection('faq', FAQS.map(([heading, body]) => ({ heading, body })));
  await seedSection('founder', FOUNDERS);
  await seedSection('activity', ACTIVITIES.map(([heading, body, imageUrl]) => ({ heading, body, imageUrl })));

  for (const [key, value] of SETTINGS) {
    // `upsert` with `$setOnInsert` so an edited value is never overwritten.
    await SiteSetting.updateOne({ key }, { $setOnInsert: { key, value } }, { upsert: true });
  }
}
