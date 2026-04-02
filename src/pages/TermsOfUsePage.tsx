import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUsePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('legal');

  useEffect(() => {
    document.title = t('termsOfUse.pageTitle');
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
          <h1 className="text-lg font-semibold text-foreground">{t('termsOfUse.headerTitle')}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm prose-neutral dark:prose-invert">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">a</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground m-0">agrodeo</h2>
            <p className="text-muted-foreground text-sm m-0">{t('termsOfUse.subtitle')}</p>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">{t('termsOfUse.lastUpdated')}</p>

        <p dangerouslySetInnerHTML={{ __html: t('termsOfUse.intro') }} />

        <h3>{t('termsOfUse.section1Title')}</h3>
        <p>{t('termsOfUse.section1Content')}</p>

        <h3>{t('termsOfUse.section2Title')}</h3>
        {renderList(t('termsOfUse.section2Items', { returnObjects: true }) as string[])}

        <h3>{t('termsOfUse.section3Title')}</h3>
        {renderList(t('termsOfUse.section3Items', { returnObjects: true }) as string[])}

        <h3>{t('termsOfUse.section4Title')}</h3>
        {renderList(t('termsOfUse.section4Items', { returnObjects: true }) as string[])}

        <h3>{t('termsOfUse.section5Title')}</h3>
        {renderList(t('termsOfUse.section5Items', { returnObjects: true }) as string[])}

        <h3>{t('termsOfUse.section6Title')}</h3>
        {renderList(t('termsOfUse.section6Items', { returnObjects: true }) as string[])}

        <h3>{t('termsOfUse.section7Title')}</h3>
        <p>{t('termsOfUse.section7Content')}</p>

        <h3>{t('termsOfUse.section8Title')}</h3>
        {renderList(t('termsOfUse.section8Items', { returnObjects: true }) as string[])}

        <h3>{t('termsOfUse.section9Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('termsOfUse.section9Content') }} />

        <h3>{t('termsOfUse.section10Title')}</h3>
        {renderList(t('termsOfUse.section10Items', { returnObjects: true }) as string[])}

        <h3>{t('termsOfUse.section11Title')}</h3>
        <p>{t('termsOfUse.section11Content')}</p>

        <h3>{t('termsOfUse.section12Title')}</h3>
        <p dangerouslySetInnerHTML={{ __html: t('termsOfUse.section12Content') }} />

        <h3>{t('termsOfUse.section13Title')}</h3>
        <p>{t('termsOfUse.section13Content')}</p>
        <p>
          📧 <a href="mailto:faustosicilia123@gmail.com">faustosicilia123@gmail.com</a>
        </p>

        <hr />
        <p className="text-xs text-muted-foreground">
          {t('termsOfUse.copyright', { year: new Date().getFullYear() })}
        </p>
      </main>
    </div>
  );
}