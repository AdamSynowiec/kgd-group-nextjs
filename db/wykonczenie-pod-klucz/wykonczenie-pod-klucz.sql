-- =============================================================================
-- Strona "Wykończenie pod klucz" — dane (tabela pages, patrz db/schema.sql)
-- =============================================================================
--
-- Nowa podstrona KGD Group (slug "/wykonczenie-pod-klucz", szablon
-- "wykonczenie-pod-klucz" — patrz src/components/wykonczenie-pod-klucz/**
-- i src/lib/wykonczenie-pod-klucz/sections.tsx). Treść 1:1 z briefu klienta
-- (nagłówki, akapity, punkty, FAQ, CTA) — tylko rozbita na pola sekcji i
-- oprawiona w kafelki/karty, bez zmian w samym tekście.
--
-- Pola "Contact"/"Footer" skopiowane z treści strony głównej (db/site/home.sql)
-- — te same, prawdziwe dane firmy (adres, telefon, e-mail); NIP/KRS/REGON
-- puste tak jak na stronie głównej (do uzupełnienia w adminie). Zmieniony
-- tylko wstępny opis formularza kontaktowego (kontekst "wykończenie pod
-- klucz" zamiast "inwestycje").
--
-- NIE ROZSTRZYGNIĘTE w briefie (patrz "Do potwierdzenia przed publikacją") —
-- do uzupełnienia w adminie, gdy klient potwierdzi: okres gwarancji, zasady
-- stałości ceny, typowy termin realizacji, podmiot podpisujący umowę,
-- możliwość 8% VAT, dostępność usługi dla nieruchomości spoza KGD, a także
-- 8–12 realnych zdjęć/case studies. Dwa miejsca już gotowe na podmianę
-- placeholdera na realne zdjęcie (pole "asset"): Hero.fields.bg oraz nowa
-- sekcja "efekt-koncowy" (FeatureImage.fields.images — lista zdjęć) —
-- slider przewijany scrollem między "Pełny zakres" a "Standard premium".
-- Pole "images" (lista zdjęć slidera) edytuje się w panelu admina: podgląd, upload, dodawanie/usuwanie wierszy; bez niego komponent pokazuje tymczasowe zdjęcia zaszyte w kodzie. Nagłówek/podtytuł tej sekcji to PROPOZYCJA (nie z briefu)
-- — do akceptacji lub zmiany przez klienta.
--
-- Import: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/wykonczenie-pod-klucz/wykonczenie-pod-klucz.sql
-- =============================================================================

INSERT INTO pages (slug, content) VALUES
  ('/wykonczenie-pod-klucz', '{
    "slug": "/wykonczenie-pod-klucz",
    "parent": "/",
    "template": "wykonczenie-pod-klucz",
    "title": "Wykończenie pod klucz",
    "updatedAt": "2026-10-06",
    "status": "published",
    "nav": {"label": "Wykończenie pod klucz", "order": 10},
    "seo": {
      "title": "Wykończenie pod klucz Kraków | KGD Group",
      "description": "Projekt, materiały, sprawdzone ekipy, meble i AGD. Kompleksowe wykończenie mieszkań i domów KGD w Krakowie - od projektu po gotowe wnętrze.",
      "keywords": ["wykończenie pod klucz Kraków", "wykończenie mieszkania pod klucz Kraków", "wykończenie domu pod klucz Kraków", "projekt i wykończenie wnętrz", "aranżacja wnętrz premium Kraków", "apartament gotowy do zamieszkania"],
      "canonical": null,
      "robots": {"index": true, "follow": true},
      "author": "KGD Group",
      "ogTitle": null,
      "ogDescription": null,
      "ogImage": null,
      "ogType": "website",
      "ogUrl": null,
      "ogSiteName": "KGD Group",
      "ogLocale": "pl_PL",
      "twitterCard": "summary_large_image",
      "twitterTitle": null,
      "twitterDescription": null,
      "twitterImage": null,
      "language": "pl",
      "structuredData": [{"type": "WebPage"}, {"type": "Service", "areaServed": "Kraków"}, {"type": "FAQPage", "from": "section:faq-wykonczenie-pod-klucz"}]
    },
    "sections": [
      {"id": "hero", "component": "Hero", "fields": {"eyebrow": "Wykończenie pod klucz", "heading": "Od projektu po gotowe wnętrze", "lead": "Projekt, materiały, wykończenie, zabudowy, meble i AGD. Jeden zespół, jeden opiekun i pełna odpowiedzialność za efekt.", "video": "/home/kgd-background.mp4", "bg": "/home/images/Pylna_Dom_4_b-min.webp"}},

      {"id": "marquee", "component": "Marquee", "fields": {"items": ["Projekt", "Materiały", "Wykończenie", "Zabudowy", "Meble", "AGD"]}},

      {"id": "przewagi", "component": "Highlights", "fields": {"header": "Najważniejsze przewagi KGD", "items": [
        {"icon": "award", "header": "400+ realizacji", "content": "Doświadczenie w remontach, aranżacjach i kompleksowych wykończeniach."},
        {"icon": "layers", "header": "Kompleksowo od A do Z", "content": "Projekt, zakupy, realizacja, stolarka, meble, oświetlenie i AGD."},
        {"icon": "users", "header": "Sprawdzone zespoły", "content": "Doświadczeni architekci, ekipy i partnerzy współpracujący z nami od lat."},
        {"icon": "tag", "header": "Lepsze warunki zakupowe", "content": "Hurtowa skala zakupów i rabaty często niedostępne klientom indywidualnym."}
      ]}},

      {"id": "stan-deweloperski", "component": "TextBlock", "fields": {"header": "Od stanu deweloperskiego do gotowego wnętrza", "paragraphs": [
        "Kupujesz mieszkanie, apartament lub dom KGD? Możesz odebrać go w pełni wykończonego, wyposażonego i gotowego do zamieszkania. Zajmiemy się całym procesem - od projektu i zakupu materiałów po meble, oświetlenie i sprzęt AGD.",
        "Ty określasz styl, potrzeby i budżet. My odpowiadamy za realizację."
      ], "cta": {"label": "ZAPYTAJ O WYKOŃCZENIE POD KLUCZ", "href": "#kontakt"}}},

      {"id": "doswiadczenie", "component": "TextBlock", "fields": {"header": "Ponad 400 realizacji doświadczenia", "paragraphs": [
        "Za usługą stoi wieloletnie doświadczenie właściciela KGD zdobyte przy ponad 400 remontach, aranżacjach i kompleksowych wykończeniach wnętrz. Dziś łączymy tę praktykę ze standardem inwestycji KGD, sprawdzonymi ekipami oraz architektami specjalizującymi się w projektach premium."
      ], "tint": true}},

      {"id": "pelny-zakres", "component": "FeatureGrid", "fields": {"header": "Pełny zakres - od A do Z", "items": [
        {"title": "Projekt wnętrza", "text": "Układ funkcjonalny, koncepcja, wizualizacje i dokumentacja wykonawcza."},
        {"title": "Materiały i logistyka", "text": "Dobór, zakup, dostawy i kontrola kompletności zamówień."},
        {"title": "Prace wykończeniowe", "text": "Instalacje, ściany, podłogi, płytki, drzwi, armatura, malowanie i oświetlenie."},
        {"title": "Stolarka i wyposażenie", "text": "Kuchnie, garderoby, szafy, meble, lustra, tekstylia i dodatki."},
        {"title": "AGD, odbiór i gwarancja", "text": "Dobór i montaż urządzeń, kontrola jakości, przekazanie wnętrza oraz opieka zgodnie z umową."},
        {"title": "Koordynacja i nadzór", "text": "Koordynacja wszystkich etapów realizacji, nadzór nad pracami oraz kontakt z wykonawcami i dostawcami."}
      ]}},

      {"id": "efekt-koncowy", "component": "FeatureImage", "fields": {"images": ["/home/images/image00014.webp", "/home/images/Pylna_Dom_3_a.webp", "/home/images/image00018-min.webp", "/home/images/image00007.webp"], "eyebrow": "Efekt końcowy", "title": "Gotowe wnętrze. Zero kompromisów.", "subtitle": "Tak wygląda mieszkanie, które odbierasz w pełni wykończone — zaprojektowane, umeblowane i gotowe do zamieszkania."}},

      {"id": "standard-premium", "component": "TextBlock", "fields": {"header": "Standard premium. Lepsze wykorzystanie budżetu.", "paragraphs": [
        "Od lat kupujemy hurtowe ilości płytek, armatury, podłóg, drzwi, oświetlenia, mebli i AGD. Dzięki stałej współpracy z producentami i dystrybutorami korzystamy z cen oraz rabatów często nieosiągalnych dla klienta indywidualnego. To pozwala uzyskać wyższy standard w założonym budżecie.",
        "Premium oznacza dla nas spójny projekt, dobre materiały, funkcjonalność i jakość wykonania widoczną w każdym detalu - bez przypadkowych rozwiązań i kompromisów."
      ]}},

      {"id": "jedna-odpowiedzialnosc", "component": "TextBlock", "fields": {"header": "Jedna odpowiedzialność", "paragraphs": [
        "Nie musisz osobno koordynować architekta, wykonawców, stolarza, dostawców i montażystów. Jeden opiekun prowadzi harmonogram, budżet, zamówienia, wykonanie i odbiory. Otrzymujesz regularne informacje o postępie oraz jeden kontakt również po zakończeniu realizacji."
      ], "tint": true}},

      {"id": "proces", "component": "Steps", "fields": {"header": "Jak wygląda współpraca", "steps": [
        {"title": "Konsultacja", "text": "Poznajemy nieruchomość, potrzeby, styl, standard i ramowy budżet."},
        {"title": "Projekt", "text": "Tworzymy układ funkcjonalny, wizualizacje i dobieramy materiały."},
        {"title": "Wycena i harmonogram", "text": "Ustalamy szczegółowy zakres, koszt oraz plan prac."},
        {"title": "Zakupy i realizacja", "text": "Koordynujemy dostawy, ekipy, wykonanie i kontrolę jakości."},
        {"title": "Odbiór", "text": "Przekazujemy gotowe wnętrze i zapewniamy obsługę gwarancyjną zgodnie z umową."}
      ]}},

      {"id": "co-zyskujesz", "component": "FeatureGrid", "fields": {"header": "Co zyskujesz", "tint": true, "items": [
        {"title": "Czas i spokój", "text": "Bez samodzielnego szukania ekip i pilnowania dostaw."},
        {"title": "Kontrolę budżetu", "text": "Przejrzysty zakres, kosztorys i zasady zmian."},
        {"title": "Spójny efekt", "text": "Projekt, materiały i wykonanie według jednej koncepcji."},
        {"title": "Lepsze ceny", "text": "Dostęp do wypracowanych rabatów i warunków partnerskich."},
        {"title": "Jakość", "text": "Sprawdzeni wykonawcy i kontrola kluczowych etapów."},
        {"title": "Gotowe wnętrze", "text": "Możliwość wprowadzenia się bez dalszego remontu."}
      ]}},

      {"id": "faq-wykonczenie-pod-klucz", "component": "Faq", "fields": {"header": "Najczęściej zadawane pytania", "items": [
        {"question": "Co obejmuje wykończenie pod klucz?", "answer": "Zakres może obejmować projekt, materiały, wszystkie uzgodnione prace, stolarkę, meble, oświetlenie, dodatki i AGD. Szczegóły określa kosztorys i umowa."},
        {"question": "Od czego zależy cena?", "answer": "Od metrażu, standardu materiałów, zmian instalacyjnych, zakresu stolarki i wyposażenia. Po konsultacji określamy budżet ramowy, a po projekcie przygotowujemy dokładną wycenę."},
        {"question": "Czy projekt można rozpocząć przed odbiorem?", "answer": "Tak. Wcześniejszy start pozwala sprawniej zamówić materiały i przygotować realizację."},
        {"question": "Czy prace są objęte gwarancją?", "answer": "Tak. Zakres i okres gwarancji określa umowa, a zgłoszenia koordynuje jeden opiekun."}
      ]}},

      {"id": "closing-cta", "component": "ClosingCta", "fields": {"header": "Twoja nieruchomość może być gotowa do życia", "message": "Umów konsultację. Omówimy potrzeby, standard i budżet, a następnie zaproponujemy zakres oraz kolejne kroki.", "cta": {"label": "UMÓW KONSULTACJĘ", "href": "#kontakt"}}},

      {"id": "contact", "component": "Contact", "type": "section", "label": "Kontakt", "fields": {"heading": {"value": "Kontakt", "editable": true, "label": "Nagłówek", "type": "string"}, "label": {"value": "Masz pytania o wykończenie pod klucz lub chcesz dowiedzieć się więcej o ofercie KGD? Wypełnij formularz - skontaktujemy się z Tobą.", "editable": true, "label": "Opis", "type": "string"}, "company": {"value": "KRAKOWSKA GRUPA DEWELOPERSKA", "editable": true, "label": "Nazwa firmy", "type": "string"}, "address": {"value": "ul. Koło Strzelnicy 2/2, 30-219 Kraków", "editable": true, "label": "Adres", "type": "string"}, "phone": {"value": "(+48) 533 087 918", "editable": true, "label": "Telefon", "type": "string"}, "email": {"value": "kontakt@kgd-group.pl", "editable": true, "label": "Email", "type": "string"}, "nip": {"value": "", "editable": true, "label": "NIP (brak w źródle — uzupełnij w adminie)", "type": "string"}, "krs": {"value": "", "editable": true, "label": "KRS (brak w źródle — uzupełnij w adminie)", "type": "string"}, "regon": {"value": "", "editable": true, "label": "REGON (brak w źródle — uzupełnij w adminie)", "type": "string"}, "fieldLabels": {"value": {"company": "Firma", "address": "Adres", "phone": "Telefon", "email": "Email", "krs": "KRS", "nip": "NIP", "regon": "REGON"}, "editable": true, "label": "Etykiety pól", "type": "table"}, "placeholders": {"value": {"name": "Imię i nazwisko *", "email": "Email *", "subject": "Temat *", "message": "Wiadomość *"}, "editable": true, "label": "Placeholdery formularza", "type": "table"}, "consents": {"value": {"consent": {"label": "* Wyrażam zgodę na przetwarzanie moich danych osobowych", "details": "Przez {{company}} dla celów marketingowych tj. w celu prezentacji oferty spółek inwestycyjnych {{company}}. Spółki inwestycyjne {{company}} oznaczają podmioty powiązane kapitałowo z {{company}} powołane w celu realizacji inwestycji i sprzedaży nieruchomości klientom indywidualnym. Pełna i aktualna lista tych podmiotów znajduje się na:"}, "consentEmail": {"label": "* Wyrażam zgodę na otrzymywanie informacji marketingowych email", "details": "Zgodnie z art. 10 ustawy z dnia 18 lipca 2002 o świadczeniu usług drogą elektroniczną w tym w szczególności na podane przeze mnie adresy email, przez {{company}} dotyczących ofert spółek inwestycyjnych {{company}}. Spółki inwestycyjne {{company}} oznaczają podmioty powiązane kapitałowo z {{company}}. Pełna lista znajduje się na:"}, "consentPhone": {"label": "* Wyrażam zgodę na kontakt telefoniczny w celach marketingowych", "details": "W szczególności przedstawienie mi informacji marketingowych i ofert handlowych przy użyciu telekomunikacyjnych urządzeń końcowych zgodnie z art. 172 ust. 1 ustawy z dnia 16 lipca 2004 r. Prawo telekomunikacyjne poprzez komunikację telefoniczną oraz SMS/MMS skierowaną na podane przeze mnie numery telefonów, przez {{company}}. Pełna lista podmiotów dostępna jest na:"}}, "editable": true, "label": "Zgody RODO", "type": "table"}, "disclaimerText": {"value": "Wszelkie wizualizacje oraz zdjęcia umieszczone na stronie internetowej i w materiałach reklamowych stanowią jedynie propozycję aranżacji.", "editable": true, "label": "Zastrzeżenie", "type": "string"}, "privacyLinkLabel": {"value": "Polityka prywatności", "editable": true, "label": "Etykieta linku do polityki prywatności", "type": "string"}, "submitLabel": {"value": "WYŚLIJ WIADOMOŚĆ", "editable": true, "label": "Etykieta przycisku wysyłki", "type": "string"}, "submittingLabel": {"value": "Wysyłanie...", "editable": true, "label": "Etykieta w trakcie wysyłki", "type": "string"}, "errors": {"value": {"name": "Podaj imię i nazwisko", "emailRequired": "Podaj adres email", "emailInvalid": "Niepoprawny adres email", "subject": "Podaj temat wiadomości", "phoneRequired": "Podaj numer telefonu", "message": "Wpisz wiadomość", "consent": "Musisz wyrazić zgodę", "phoneCountry": "Wybierz kraj", "phoneLength": "Numer telefonu musi mieć dokładnie {{length}} cyfr", "submitSuccess": "Wiadomość została wysłana!", "submitFailed": "Wystąpił błąd podczas wysyłania.", "submitError": "Wystąpił błąd. Spróbuj ponownie później."}, "editable": true, "label": "Komunikaty błędów", "type": "table"}}},

      {"id": "footer", "component": "Footer", "type": "section", "label": "Stopka", "fields": {"custom": {"header": {"value": "Biuro sprzedaży", "editable": true, "label": "Nagłówek pierwszej kolumny (nadpisuje domyślne \"Deweloper\")", "type": "string"}}, "description": {"value": "Luksusowe inwestycje w prestiżowych lokalizacjach w Polsce – nowoczesne projekty deweloperskie najwyższej jakości.", "editable": true, "label": "Opis", "type": "string"}, "building_description": {"value": "KGD Building pomaga indywidualnym klientom zrealizować wymarzony dom – od projektu po wykonanie w najwyższym standardzie.", "editable": true, "label": "Opis KGD Building", "type": "string"}, "company": {"value": "KRAKOWSKA GRUPA DEWELOPERSKA", "editable": true, "label": "Nazwa firmy", "type": "string"}, "krs": {"value": "", "editable": true, "label": "KRS (brak w źródle — uzupełnij w adminie)", "type": "string"}, "nip": {"value": "", "editable": true, "label": "NIP (brak w źródle — uzupełnij w adminie)", "type": "string"}, "regon": {"value": "", "editable": true, "label": "REGON (brak w źródle — uzupełnij w adminie)", "type": "string"}, "address": {"value": "ul. Koło Strzelnicy 2/2, 30-219 Kraków", "editable": true, "label": "Adres", "type": "string"}, "phone": {"value": "12 352 15 00", "editable": true, "label": "Telefon", "type": "string"}, "email": {"value": "kontakt@kgd-group.pl", "editable": true, "label": "Email", "type": "string"}, "investments": {"value": [{"text": "Królowej Jadwigi Residence II", "url": "/inwestycja/krj307-2"}, {"text": "Apartamenty Pod Stokiem", "url": "/inwestycja/apartamenty-podstokiem"}, {"text": "Morelife Apartments", "url": "/inwestycja/morelife-apartments"}, {"text": "Rudava Park", "url": "/inwestycja/rudava-park"}, {"text": "Villa Verde", "url": "/inwestycja/villaverde-wola"}, {"text": "Willa Pod Stokiem", "url": "/inwestycja/willa-podstokiem"}, {"text": "Zielona Polana 3", "url": "/inwestycja/zielona-polana-3"}, {"text": "The Emaus", "url": "/inwestycja/the-emaus"}, {"text": "Pylna Residence", "url": "/inwestycja/pylnaresidence"}], "editable": true, "label": "Lista inwestycji", "type": "table"}, "socials": {"value": [{"icon": "youtube", "href": "https://www.youtube.com/@KGD-Group", "label": "YouTube"}, {"icon": "instagram", "href": "https://www.instagram.com/krakowska_grupa_deweloperska/", "label": "Instagram"}, {"icon": "facebook", "href": "https://www.facebook.com/krakowskagrupadeweloperska/?locale=pl_PL", "label": "Facebook"}], "editable": true, "label": "Social media", "type": "table"}, "columnHeaders": {"value": {"developer": "Deweloper", "investments": "Inwestycje", "kgdBuilding": "KGD Building", "cooperation": "Współpraca"}, "editable": true, "label": "Nagłówki kolumn", "type": "table"}, "kgdBuildingLinks": {"value": {"private": "Dla osoby prywatnej", "developer": "Dla dewelopera"}, "editable": true, "label": "Linki KGD Building", "type": "table"}, "cooperationLinks": {"value": {"investor": "Dla inwestora", "land": "Zakup gruntów"}, "editable": true, "label": "Linki współpracy", "type": "table"}, "privacyLinkLabel": {"value": "Polityka prywatności", "editable": true, "label": "Etykieta linku do polityki prywatności", "type": "string"}, "copyrightText": {"value": "KGD GROUP. Wszelkie prawa zastrzeżone.", "editable": true, "label": "Tekst praw autorskich", "type": "string"}}}
    ],
    "related": {"mode": "manual", "manual": []}
  }')
ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = CURRENT_TIMESTAMP;
