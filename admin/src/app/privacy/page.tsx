import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageShell } from '@/components/legal-page-shell';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy Policy — Suniagch',
  description:
    'Suniagch mobile application privacy policy. How we collect, use, and protect your personal information.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SITE.url}/privacy`,
  },
};

const lastUpdated = 'September 23, 2026';

const sections = [
  {
    title: '1. Introduction',
    titleMn: '1. Оршил',
    body: [
      'Suniagch (“we”, “our”, “us”) operates the Suniagch mobile application and related services (the “Service”). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our app.',
      'By using Suniagch, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.',
    ],
    bodyMn: [
      'Suniagch (“бид”) нь Suniagch гар утасны апп болон холбогдох үйлчилгээг (“Үйлчилгээ”) үзүүлдэг. Энэхүү Нууцлалын бодлого нь та манай аппыг ашиглах үед таны мэдээллийг хэрхэн цуглуулж, ашиглаж, хамгаалдаг талаар тайлбарлана.',
      'Suniagch-ийг ашигласнаар та энэ бодлогын дагуу мэдээлэл цуглуулж, ашиглахыг зөвшөөрч байна.',
    ],
  },
  {
    title: '2. Information We Collect',
    titleMn: '2. Цуглуулдаг мэдээлэл',
    body: [
      'Account information: email, display name, password (hashed), and Google sign-in identifier when used.',
      'Fitness data: push-up counts, workout history, streaks, daily goals, and body profile (height, weight, age, fitness level).',
      'Camera & pose: camera frames processed on-device for push-up detection; we do not store raw video by default.',
      'Payments: subscription plan and order status. Payments are processed via QPay and banks — we do not store full card details.',
      'Shop: cart contents, shipping contact details, and order history.',
      'Device data: FCM push token, platform (iOS/Android), and app preferences stored locally.',
      'Social & duels: friend connections, duel scores, and public user ID for invites.',
    ],
    bodyMn: [
      'Бүртгэл: и-мэйл, нэр, нууц үг (hash), Google нэвтрэлт.',
      'Фитнес: суниалтын тоо, дасгалын түүх, дараалал, өдрийн зорилго, биеийн мэдээлэл.',
      'Камер: суниалт тоолох зорилгоор төхөөрөмж дээр боловсруулна; видеог серверт хадгалдаггүй.',
      'Төлбөр: багц, захиалгын төлөв; QPay/банк дамжуулан боловсруулна.',
      'Дэлгүүр: сагс, холбоо барих мэдээлэл, захиалгын түүх.',
      'Төхөөрөмж: push token, платформ, локал тохиргоо.',
      'Тулаан: найз, duel оноо, урилга өгөх public ID.',
    ],
  },
  {
    title: '3. How We Use Your Information',
    titleMn: '3. Мэдээллийг хэрхэн ашигладаг вэ',
    body: [
      'Provide, maintain, and improve the Suniagch app and workout features.',
      'Process Premium subscriptions and shop orders.',
      'Send push notifications (workout reminders, service updates) when enabled.',
      'Enable live duels and friend challenges.',
      'Protect against fraud, abuse, and unauthorized access.',
      'Comply with applicable laws and regulations.',
    ],
    bodyMn: [
      'Апп, дасгалын функцүүдийг үзүүлж сайжруулах.',
      'Premium гишүүнчлэл, дэлгүүрийн захиалга боловсруулах.',
      'Push мэдэгдэл илгээх (дасгалын сануулга г.м).',
      'Live duel, найзын челленжийг идэвхжүүлэх.',
      'Залилан, зөвшөөрөлгүй хандалтаас хамгаалах.',
      'Холбогдох хууль, дүрмийг мөрдөх.',
    ],
  },
  {
    title: '4. Information Sharing',
    titleMn: '4. Мэдээлэл хуваалцах',
    body: [
      'We do not sell your personal information.',
      'We may share data with trusted service providers who help us operate the Service (hosting, Firebase/Google for authentication and push notifications, QPay, Cloudinary for images), subject to confidentiality obligations.',
      'We may disclose information if required by law, court order, or to protect the rights, safety, and security of Suniagch and our users.',
    ],
    bodyMn: [
      'Бид хувийн мэдээллийг худалдаж, борлуулдаггүй.',
      'Hosting, Firebase, QPay, Cloudinary зэрэг үйлчилгээ үзүүлэгчидтэй нууцлалын үүрэгтэйгээр хуваалцаж болно.',
      'Хууль, шүүхийн шийдвэрээр шаардлагатай бол илчлэнэ.',
    ],
  },
  {
    title: '5. Data Retention & Security',
    titleMn: '5. Хадгалалт ба аюулгүй байдал',
    body: [
      'We retain your information for as long as your account is active or as needed to provide the Service and meet legal obligations.',
      'We use reasonable administrative, technical, and organizational measures to protect your data, including encrypted connections (HTTPS) and secure password storage.',
      'No method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.',
    ],
    bodyMn: [
      'Бүртгэл идэвхтэй байх хугацаанд, мөн Үйлчилгээ үзүүлэхэд шаардлагатай хугацаанд мэдээллийг хадгална.',
      'HTTPS шифрлэлт, аюулгүй нууц үг хадгалалт зэрэг арга хэмжээ авдаг.',
      'Интернэтээр дамжуулах ямар ч арга 100% аюулгүй биш.',
    ],
  },
  {
    title: '6. Your Rights & Choices',
    titleMn: '6. Таны эрх',
    body: [
      'Access and update your profile information within the app.',
      'Opt out of push notifications in your device settings.',
      'Request account deletion by contacting us at the email below.',
      'Depending on your jurisdiction, you may have additional rights under applicable data protection laws.',
    ],
    bodyMn: [
      'Апп дотор профайлын мэдээллээ харах, шинэчлэх.',
      'Төхөөрөмжийн тохиргооноос push мэдэгдэл унтраах.',
      'Доорх и-мэйлээр холбогдож бүртгэл устгуулах хүсэлт илгээх.',
    ],
  },
  {
    title: "7. Children's Privacy",
    titleMn: '7. Хүүхдийн нууцлал',
    body: [
      'Suniagch is intended for users 13 years and older. We do not knowingly collect personal information from children under 13. If you believe we have collected such data, please contact us and we will delete it promptly.',
    ],
    bodyMn: [
      'Suniagch нь 13-аас дээш насны хэрэглэгчид зориулагдсан. Бид 13-аас доош насны хүүхдээс мэдээлэл цуглуулдаггүй.',
    ],
  },
  {
    title: '8. Third-Party Services',
    titleMn: '8. Гуравдагч этгээд',
    body: [
      'The app may use third-party services including Google Sign-In, Firebase Cloud Messaging, QPay, and Cloudinary. Their privacy practices are governed by their own policies.',
    ],
    bodyMn: [
      'Апп Google Sign-In, Firebase, QPay, Cloudinary зэрэг гуравдагч үйлчилгээ ашиглаж болно. Тэдгээрийн нууцлалыг тус бүрийн бодлогоор зохицуулна.',
    ],
  },
  {
    title: '9. Changes to This Policy',
    titleMn: '9. Бодлогын өөрчлөлт',
    body: [
      'We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the “Last updated” date. Continued use of the Service after changes constitutes acceptance of the updated policy.',
    ],
    bodyMn: [
      'Бид энэ бодлогыг цаг хугацааны явцад шинэчилж болно. Шинэчилсэн хувийг энэ хуудсанд байршуулна.',
    ],
  },
  {
    title: '10. Contact Us',
    titleMn: '10. Холбоо барих',
    body: [
      'If you have questions about this Privacy Policy or your personal data, contact us at:',
      `Email: ${SITE.privacyEmail}`,
      'App name: Suniagch',
      `Website: ${SITE.url}`,
    ],
    bodyMn: [
      'Энэ бодлого эсвэл хувийн мэдээллийн талаар асуулт байвал холбогдоно уу:',
      `И-мэйл: ${SITE.privacyEmail}`,
      'Апп: Suniagch',
      `Вэб: ${SITE.url}`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle={`Нууцлалын бодлого · Last updated: ${lastUpdated}`}
    >
      <p className="mb-8 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/60">
        This page is the official privacy policy URL for the Suniagch mobile app, submitted to
        Google Play and Apple App Store. It is publicly available at{' '}
        <strong className="text-white">{SITE.url}/privacy</strong>.
      </p>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-white">{section.title}</h2>
            <h3 className="mt-1 text-base font-semibold text-[#f59e0b]">{section.titleMn}</h3>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/60">
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-4 space-y-3 border-l-2 border-[#f59e0b]/30 pl-4 text-sm leading-relaxed text-white/80">
              {section.bodyMn.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/50">
        <p>
          <a href={`mailto:${SITE.privacyEmail}`} className="text-[#f59e0b] hover:underline">
            {SITE.privacyEmail}
          </a>
          {' · '}
          <Link href="/" className="text-[#f59e0b] hover:underline">
            {SITE.domain}
          </Link>
        </p>
      </div>
    </LegalPageShell>
  );
}
