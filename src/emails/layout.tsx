import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { BRAND } from "#/lib/brand";
import { m } from "#/paraglide/messages.js";
import type { Locale } from "#/paraglide/runtime.js";

export interface ActionEmailProps {
  body: string;
  button: string;
  locale: Locale;
  origin: string;
  title: string;
  url: string;
}

const INK = "#0a0a0a";
const SCHEME = /^https?:\/\//;
const MUTED = "#737373";

/** One layout for every account email: logo, heading, text, one button. */
export function ActionEmail({
  title,
  body,
  button,
  url,
  origin,
  locale,
}: ActionEmailProps) {
  const t = { locale };
  return (
    <Html dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <Head />
      <Preview>{title}</Preview>
      <Body
        style={{
          backgroundColor: "#f4f4f4",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            maxWidth: 480,
            padding: "36px 32px",
          }}
        >
          <Img
            alt={BRAND.name}
            height={40}
            src={`${origin}${BRAND.logo}`}
            style={{ borderRadius: 10 }}
            width={40}
          />
          <Heading
            style={{
              color: INK,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              margin: "28px 0 12px",
            }}
          >
            {title}
          </Heading>
          <Text style={{ color: "#404040", fontSize: 15, lineHeight: "24px" }}>
            {body}
          </Text>
          <Section style={{ margin: "28px 0" }}>
            <Button
              href={url}
              style={{
                backgroundColor: INK,
                borderRadius: 999,
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 500,
                padding: "12px 22px",
              }}
            >
              {button}
            </Button>
          </Section>
          <Text style={{ color: MUTED, fontSize: 13, lineHeight: "20px" }}>
            {m.email_button_fallback({}, t)}
            <br />
            <Link href={url} style={{ color: MUTED, wordBreak: "break-all" }}>
              {url}
            </Link>
          </Text>
          <Hr style={{ borderColor: "#ebebeb", margin: "28px 0 20px" }} />
          <Text style={{ color: MUTED, fontSize: 12, lineHeight: "18px" }}>
            {m.email_footer({ site: origin.replace(SCHEME, "") }, t)}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
