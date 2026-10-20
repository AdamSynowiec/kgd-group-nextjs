<?php

declare(strict_types=1);

namespace App\PriceReport;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * 58 kolumn ustawowego zbioru cen ofertowych (art. 19b ustawy deweloperskiej) —
 * dokładnie w kolejności i z nagłówkami jak w dotychczasowym generatorze
 * (ext_price_raport_generator/headers.php), żeby pliki dla dane.gov.pl były zgodne.
 *
 * Każda kolumna ma klucz kanoniczny + aliasy: tabele "historia cen" w bazie (sekcja
 * PriceHistory) używają różnych nazw kluczy dla tej samej kolumny (np. "krs" vs
 * "krsNumber", "hqCommune" vs "hqMunicipality" w Morelife). Wartości są zawsze
 * wybierane PO KLUCZU, a kolejność w CSV wynika z tej listy — nigdy z kolejności
 * pól w danych (to był błąd starego skryptu: wiersze miały 59 pól przy 58 nagłówkach).
 *
 * "kind" decyduje o normalizacji wartości (PriceReportGenerator::normalize()).
 */
final class StatutoryColumns
{
    public const TEXT = 'text';
    public const PRICE = 'price';
    public const DATE = 'date';

    /** @var list<array{key: string, aliases: list<string>, kind: string, header: string}> */
    public const ALL = [
        ['key' => 'developerName', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Nazwa dewelopera'],
        ['key' => 'developerLegalForm', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Forma prawna dewelopera'],
        ['key' => 'krs', 'aliases' => ['krsNumber'], 'kind' => self::TEXT, 'header' => 'Nr KRS'],
        ['key' => 'ceidgNumber', 'aliases' => ['ceidg'], 'kind' => self::TEXT, 'header' => 'Nr wpisu do CEiDG'],
        ['key' => 'nip', 'aliases' => ['nipNumber'], 'kind' => self::TEXT, 'header' => 'Nr NIP'],
        ['key' => 'regon', 'aliases' => ['regonNumber'], 'kind' => self::TEXT, 'header' => 'Nr REGON'],
        ['key' => 'phone', 'aliases' => ['phoneNumber'], 'kind' => self::TEXT, 'header' => 'Nr telefonu'],
        ['key' => 'email', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Adres poczty elektronicznej'],
        ['key' => 'fax', 'aliases' => ['faxNumber'], 'kind' => self::TEXT, 'header' => 'Nr faxu'],
        ['key' => 'developerWebsite', 'aliases' => ['website'], 'kind' => self::TEXT, 'header' => 'Adres strony internetowej dewelopera'],
        ['key' => 'hqVoivodeship', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Województwo adresu siedziby/głównego miejsca wykonywania działalności gospodarczej dewelopera'],
        ['key' => 'hqCounty', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Powiat adresu siedziby/głównego miejsca wykonywania działalności gospodarczej dewelopera'],
        ['key' => 'hqCommune', 'aliases' => ['hqMunicipality'], 'kind' => self::TEXT, 'header' => 'Gmina adresu siedziby/głównego miejsca wykonywania działalności gospodarczej dewelopera'],
        ['key' => 'hqCity', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Miejscowość adresu siedziby/głównego miejsca wykonywania działalności gospodarczej dewelopera'],
        ['key' => 'hqStreet', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Ulica adresu siedziby/głównego miejsca wykonywania działalności gospodarczej dewelopera'],
        ['key' => 'hqBuildingNo', 'aliases' => ['hqBuildingNumber'], 'kind' => self::TEXT, 'header' => 'Nr nieruchomości adresu siedziby/głównego miejsca wykonywania działalności gospodarczej dewelopera'],
        ['key' => 'hqUnitNo', 'aliases' => ['hqUnitNumber'], 'kind' => self::TEXT, 'header' => 'Nr lokalu adresu siedziby/głównego miejsca wykonywania działalności gospodarczej dewelopera'],
        ['key' => 'hqPostalCode', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Kod pocztowy adresu siedziby/głównego miejsca wykonywania działalności gospodarczej dewelopera'],
        ['key' => 'salesVoivodeship', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Województwo adresu lokalu, w którym prowadzona jest sprzedaż'],
        ['key' => 'salesCounty', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Powiat adresu lokalu, w którym prowadzona jest sprzedaż'],
        ['key' => 'salesCommune', 'aliases' => ['salesMunicipality'], 'kind' => self::TEXT, 'header' => 'Gmina adresu lokalu, w którym prowadzona jest sprzedaż'],
        ['key' => 'salesCity', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Miejscowość adresu lokalu, w którym prowadzona jest sprzedaż'],
        ['key' => 'salesStreet', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Ulica adresu lokalu, w którym prowadzona jest sprzedaż'],
        ['key' => 'salesBuildingNo', 'aliases' => ['salesBuildingNumber'], 'kind' => self::TEXT, 'header' => 'Nr nieruchomości adresu lokalu, w którym prowadzona jest sprzedaż'],
        ['key' => 'salesUnitNo', 'aliases' => ['salesUnitNumber'], 'kind' => self::TEXT, 'header' => 'Nr lokalu adresu lokalu, w którym prowadzona jest sprzedaż'],
        ['key' => 'salesPostalCode', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Kod pocztowy adresu lokalu, w którym prowadzona jest sprzedaż'],
        ['key' => 'salesAdditionalLocations', 'aliases' => ['additionalSalesLocations'], 'kind' => self::TEXT, 'header' => 'Dodatkowe lokalizacje, w których prowadzona jest sprzedaż'],
        ['key' => 'contactMethod', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Sposób kontaktu nabywcy z deweloperem'],
        ['key' => 'investmentVoivodeship', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Województwo lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['key' => 'investmentCounty', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Powiat lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['key' => 'investmentCommune', 'aliases' => ['investmentMunicipality'], 'kind' => self::TEXT, 'header' => 'Gmina lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['key' => 'investmentCity', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Miejscowość lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['key' => 'investmentStreet', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Ulica lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['key' => 'investmentBuildingNo', 'aliases' => ['investmentBuildingNumber'], 'kind' => self::TEXT, 'header' => 'Nr nieruchomości lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['key' => 'investmentPostalCode', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Kod pocztowy lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['key' => 'propertyType', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Rodzaj nieruchomości: lokal mieszkalny, dom jednorodzinny'],
        ['key' => 'unit', 'aliases' => ['unitNumber'], 'kind' => self::TEXT, 'header' => 'Nr lokalu lub domu jednorodzinnego nadany przez dewelopera'],
        ['key' => 'pricePerM2', 'aliases' => ['pricePerM2Current'], 'kind' => self::PRICE, 'header' => 'Cena m2 powierzchni użytkowej lokalu mieszkalnego / domu jednorodzinnego [zł]'],
        ['key' => 'pricePerM2Date', 'aliases' => ['pricePerM2CurrentDate'], 'kind' => self::DATE, 'header' => 'Data od której cena obowiązuje cena m2 powierzchni użytkowej lokalu mieszkalnego / domu jednorodzinnego'],
        ['key' => 'totalPrice', 'aliases' => ['totalPriceCurrent'], 'kind' => self::PRICE, 'header' => 'Cena lokalu mieszkalnego lub domu jednorodzinnego będących przedmiotem umowy stanowiąca iloczyn ceny m2 oraz powierzchni [zł]'],
        ['key' => 'totalPriceDate', 'aliases' => ['totalPriceCurrentDate'], 'kind' => self::DATE, 'header' => 'Data od której cena obowiązuje cena lokalu mieszkalnego lub domu jednorodzinnego będących przedmiotem umowy stanowiąca iloczyn ceny m2 oraz powierzchni'],
        ['key' => 'priceWithComponents', 'aliases' => [], 'kind' => self::PRICE, 'header' => 'Cena lokalu mieszkalnego lub domu jednorodzinnego uwzględniająca cenę lokalu stanowiącą iloczyn powierzchni oraz metrażu i innych składowych ceny, o których mowa w art. 19a ust. 1 pkt 1), 2) lub 3) [zł]'],
        ['key' => 'priceWithComponentsDate', 'aliases' => [], 'kind' => self::DATE, 'header' => 'Data od której obowiązuje cena lokalu mieszkalnego lub domu jednorodzinnego uwzględniająca cenę lokalu stanowiącą iloczyn powierzchni oraz metrażu i innych składowych ceny, o których mowa w art. 19a ust. 1 pkt 1), 2) lub 3)'],
        ['key' => 'propertyPartType', 'aliases' => ['partType'], 'kind' => self::TEXT, 'header' => 'Rodzaj części nieruchomości będących przedmiotem umowy'],
        ['key' => 'propertyPartLabel', 'aliases' => ['partLabel'], 'kind' => self::TEXT, 'header' => 'Oznaczenie części nieruchomości nadane przez dewelopera'],
        ['key' => 'propertyPartPrice', 'aliases' => ['partPrice'], 'kind' => self::PRICE, 'header' => 'Cena części nieruchomości, będących przedmiotem umowy [zł]'],
        ['key' => 'propertyPartPriceDate', 'aliases' => ['partPriceDate'], 'kind' => self::DATE, 'header' => 'Data od której obowiązuje cena części nieruchomości, będących przedmiotem umowy'],
        ['key' => 'ancillaryRoomType', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Rodzaj pomieszczeń przynależnych, o których mowa w art. 2 ust. 4 ustawy z dnia 24 czerwca 1994 r. o własności lokali'],
        ['key' => 'ancillaryRoomLabel', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Oznaczenie pomieszczeń przynależnych, o których mowa w art. 2 ust. 4 ustawy z dnia 24 czerwca 1994 r. o własności lokali'],
        ['key' => 'ancillaryRoomPrice', 'aliases' => [], 'kind' => self::PRICE, 'header' => 'Wyszczególnienie cen pomieszczeń przynależnych, o których mowa w art. 2 ust. 4 ustawy z dnia 24 czerwca 1994 r. o własności lokali [zł]'],
        ['key' => 'ancillaryRoomPriceDate', 'aliases' => [], 'kind' => self::DATE, 'header' => 'Data od której obowiązuje cena wyszczególnionych pomieszczeń przynależnych, o których mowa w art. 2 ust. 4 ustawy z dnia 24 czerwca 1994 r. o własności lokali'],
        ['key' => 'necessaryRights', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Wyszczególnienie praw niezbędnych do korzystania z lokalu mieszkalnego lub domu jednorodzinnego'],
        ['key' => 'necessaryRightsValue', 'aliases' => [], 'kind' => self::PRICE, 'header' => 'Wartość praw niezbędnych do korzystania z lokalu mieszkalnego lub domu jednorodzinnego [zł]'],
        ['key' => 'necessaryRightsValueDate', 'aliases' => [], 'kind' => self::DATE, 'header' => 'Data od której obowiązuje cena wartości praw niezbędnych do korzystania z lokalu mieszkalnego lub domu jednorodzinnego'],
        ['key' => 'otherPaymentsType', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Wyszczególnienie rodzajów innych świadczeń pieniężnych, które nabywca zobowiązany jest spełnić na rzecz dewelopera w wykonaniu umowy przenoszącej własność'],
        ['key' => 'otherPaymentsValue', 'aliases' => [], 'kind' => self::PRICE, 'header' => 'Wartość innych świadczeń pieniężnych, które nabywca zobowiązany jest spełnić na rzecz dewelopera w wykonaniu umowy przenoszącej własność [zł]'],
        ['key' => 'otherPaymentsValueDate', 'aliases' => [], 'kind' => self::DATE, 'header' => 'Data od której obowiązuje cena wartości innych świadczeń pieniężnych, które nabywca zobowiązany jest spełnić na rzecz dewelopera w wykonaniu umowy przenoszącej własność'],
        ['key' => 'prospectusUrl', 'aliases' => [], 'kind' => self::TEXT, 'header' => 'Adres strony internetowej, pod którym dostępny jest prospekt informacyjny'],
    ];

    /** Kolumny, bez których plik nie identyfikuje dewelopera — brak w tabeli = raport nie powstaje (zamiast publikować niepełne dane). */
    public const REQUIRED = ['developerName', 'developerLegalForm', 'nip', 'propertyType'];

    /** @return list<string> */
    public static function headers(): array
    {
        return array_column(self::ALL, 'header');
    }
}
