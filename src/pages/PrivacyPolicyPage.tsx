import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('legal');

  useEffect(() => {
    document.title = t('privacyPolicy.pageTitle');
  }, [t]);

  const renderList = (items: string[]) => (
    <ul>
      {items.map((item, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4 max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">{t('privacyPolicy.headerTitle')}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm prose-neutral dark:prose-invert">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">a</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground m-0">agrodeo</h2>
            <p className="text-muted-foreground text-sm m-0">{t('privacyPolicy.subtitle')}</p>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">{t('privacyPolicy.lastUpdated')}</p>

        <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.intro') }} />

        <h3>{t('privacyPolicy.section1Title')}</h3>
        <h4>{t('privacyPolicy.section1Sub1')}</h4>
        {renderList(t('privacyPolicy.section1Sub1Items', { returnObjects: true }) as string[])}
        <h4>{t('privacyPolicy.section1Sub2')}</h4>
        {renderList(t('privacyPolicy.section1Sub2Items', { returnObjects: true }) as string[])}
        <h4>{t('privacyPolicy.section1Sub3')}</h4>
        {renderList(t('privacyPolicy.section1Sub3Items', { returnObjects: true }) as string[])}

        <h3>{t('privacyPolicy.section2Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.section2Content') }} />

        <h3>{t('privacyPolicy.section3Title')}</h3>
        {renderList(t('privacyPolicy.section3Items', { returnObjects: true }) as string[])}

        <h3>{t('privacyPolicy.section4Title')}</h3>
        <p>{t('privacyPolicy.section4Intro')}</p>
        {renderList(t('privacyPolicy.section4Items', { returnObjects: true }) as string[])}
        <p>{t('privacyPolicy.section4Outro')}</p>

        <h3>{t('privacyPolicy.section5Title')}</h3>
        <p>{t('privacyPolicy.section5Intro')}</p>
        {renderList(t('privacyPolicy.section5Items', { returnObjects: true }) as string[])}
        <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.section5Outro') }} />

        <h3>{t('privacyPolicy.section6Title')}</h3>
        <p>{t('privacyPolicy.section6Intro')}</p>
        {renderList(t('privacyPolicy.section6Items', { returnObjects: true }) as string[])}
        <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.section6Outro') }} />

        <h3>{t('privacyPolicy.section7Title')}</h3>
        <p>{t('privacyPolicy.section7Intro')}</p>
        {renderList(t('privacyPolicy.section7Items', { returnObjects: true }) as string[])}
        <p>{t('privacyPolicy.section7Outro')}</p>

        <h3>{t('privacyPolicy.section8Title')}</h3>
        <p>{t('privacyPolicy.section8Content')}</p>

        <h3>{t('privacyPolicy.section9Title')}</h3>
        <p>{t('privacyPolicy.section9Content')}</p>

        <h3>{t('privacyPolicy.section10Title')}</h3>
        <p>{t('privacyPolicy.section10Content')}</p>

        <h3>{t('privacyPolicy.section11Title')}</h3>
        <p>{t('privacyPolicy.section11Content')}</p>
        <p>
          📧 <a href="mailto:faustosicilia123@gmail.com">faustosicilia123@gmail.com</a>
        </p>

        <hr />
        <p className="text-xs text-muted-foreground">
          {t('privacyPolicy.copyright', { year: new Date().getFullYear() })}
        </p>
      </main>
    </div>
  );
}