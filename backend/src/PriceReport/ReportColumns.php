<?php

declare(strict_types=1);

namespace App\PriceReport;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Struktura raportu cen od 11.11.2026 — 48 pól (A–H) z załącznika do rozporządzenia Ministra Cyfryzacji
 * z 10.11.2026 (Dz.U. 2026 poz. 1489). Nagłówki dokładnie jak we wzorcowym pliku CSV ministerstwa
 * (dane.gov.pl, Baza wiedzy → "Wzorcowe dokumenty elektroniczne… 11.11.2026"); F5, G4, H4 mają tam
 * dopiski "dla pomieszczenia przynależnego" / "dla prawa niezbędnego" / "dla innego świadczenia".
 *
 * Rejestr w tej strukturze rozpoznaje się po kolumnie "investmentLongitude" (PriceReportGenerator::isCurrentFormat());
 * rejestry jeszcze nieprzekształcone (58 kolumn, StatutoryColumns) generują się po staremu.
 *
 * "kind": text, amount (kwota: "15500,00"), datetime ("RRRR-MM-DD GG:MM:SS"), longitude / latitude (WGS-84,
 * 6 miejsc po przecinku: "19,721071"), unitRef (F5/G4/H4 — identyfikator lokalu, uzupełniany z E2).
 * "required": pole wymagane w rozporządzeniu ("wymagane"); warunkowe — puste = "X".
 */
final class ReportColumns
{
    public const TEXT = 'text';
    public const AMOUNT = 'amount';
    public const DATETIME = 'datetime';
    public const LONGITUDE = 'longitude';
    public const LATITUDE = 'latitude';
    public const UNIT_REF = 'unitRef';

    /** Klucz kolumny rejestru, po którym poznaje się rejestr w tej strukturze. */
    public const MARKER = 'investmentLongitude';

    /** @var list<array{field: string, key: string, aliases: list<string>, kind: string, required: bool, header: string}> */
    public const ALL = [
        ['field' => 'A1', 'key' => 'developerName', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Firma'],
        ['field' => 'A2', 'key' => 'nip', 'aliases' => ['nipNumber'], 'kind' => self::TEXT, 'required' => true, 'header' => 'Numer identyfikacji podatkowej (NIP)'],
        ['field' => 'B1', 'key' => 'hqVoivodeship', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Województwo adresu siedziby albo głównego miejsca wykonywania działalności gospodarczej'],
        ['field' => 'B2', 'key' => 'hqCounty', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Powiat adresu siedziby albo głównego miejsca wykonywania działalności gospodarczej'],
        ['field' => 'B3', 'key' => 'hqCommune', 'aliases' => ['hqMunicipality'], 'kind' => self::TEXT, 'required' => true, 'header' => 'Gmina adresu siedziby albo głównego miejsca wykonywania działalności gospodarczej'],
        ['field' => 'B4', 'key' => 'hqCity', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Miejscowość adresu siedziby albo głównego miejsca wykonywania działalności gospodarczej'],
        ['field' => 'B5', 'key' => 'hqStreet', 'aliases' => [], 'kind' => self::TEXT, 'required' => false, 'header' => 'Ulica adresu siedziby albo głównego miejsca wykonywania działalności gospodarczej'],
        ['field' => 'B6', 'key' => 'hqBuildingNo', 'aliases' => ['hqBuildingNumber'], 'kind' => self::TEXT, 'required' => true, 'header' => 'Numer nieruchomości adresu siedziby albo głównego miejsca wykonywania działalności gospodarczej'],
        ['field' => 'B7', 'key' => 'hqUnitNo', 'aliases' => ['hqUnitNumber'], 'kind' => self::TEXT, 'required' => false, 'header' => 'Numer lokalu adresu siedziby albo głównego miejsca wykonywania działalności gospodarczej'],
        ['field' => 'B8', 'key' => 'hqPostalCode', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Kod pocztowy adresu siedziby albo głównego miejsca wykonywania działalności gospodarczej'],
        ['field' => 'C1', 'key' => 'salesVoivodeship', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Województwo adresu lokalu, w którym jest prowadzona sprzedaż'],
        ['field' => 'C2', 'key' => 'salesCounty', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Powiat adresu lokalu, w którym jest prowadzona sprzedaż'],
        ['field' => 'C3', 'key' => 'salesCommune', 'aliases' => ['salesMunicipality'], 'kind' => self::TEXT, 'required' => true, 'header' => 'Gmina adresu lokalu, w którym jest prowadzona sprzedaż'],
        ['field' => 'C4', 'key' => 'salesCity', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Miejscowość adresu lokalu, w którym jest prowadzona sprzedaż'],
        ['field' => 'C5', 'key' => 'salesStreet', 'aliases' => [], 'kind' => self::TEXT, 'required' => false, 'header' => 'Ulica adresu lokalu, w którym jest prowadzona sprzedaż'],
        ['field' => 'C6', 'key' => 'salesBuildingNo', 'aliases' => ['salesBuildingNumber'], 'kind' => self::TEXT, 'required' => true, 'header' => 'Numer nieruchomości adresu lokalu, w którym jest prowadzona sprzedaż'],
        ['field' => 'C7', 'key' => 'salesUnitNo', 'aliases' => ['salesUnitNumber'], 'kind' => self::TEXT, 'required' => false, 'header' => 'Numer lokalu adresu lokalu, w którym jest prowadzona sprzedaż'],
        ['field' => 'C8', 'key' => 'salesPostalCode', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Kod pocztowy adresu lokalu, w którym jest prowadzona sprzedaż'],
        ['field' => 'C9', 'key' => 'salesAdditionalLocations', 'aliases' => ['additionalSalesLocations'], 'kind' => self::TEXT, 'required' => false, 'header' => 'Dodatkowe lokalizacje, w których jest prowadzona sprzedaż'],
        ['field' => 'C10', 'key' => 'contactMethod', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Sposób kontaktu nabywcy z podmiotem obowiązanym'],
        ['field' => 'D1', 'key' => 'investmentVoivodeship', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Województwo lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'D2', 'key' => 'investmentCounty', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Powiat lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'D3', 'key' => 'investmentCommune', 'aliases' => ['investmentMunicipality'], 'kind' => self::TEXT, 'required' => true, 'header' => 'Gmina lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'D4', 'key' => 'investmentCity', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Miejscowość lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'D5', 'key' => 'investmentStreet', 'aliases' => [], 'kind' => self::TEXT, 'required' => false, 'header' => 'Ulica lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'D6', 'key' => 'investmentBuildingNo', 'aliases' => ['investmentBuildingNumber'], 'kind' => self::TEXT, 'required' => false, 'header' => 'Numer nieruchomości lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'D7', 'key' => 'investmentPostalCode', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Kod pocztowy lokalizacji przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'D8', 'key' => 'investmentLongitude', 'aliases' => [], 'kind' => self::LONGITUDE, 'required' => true, 'header' => 'Długość geograficzna punktu określającego lokalizację przestrzenną przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'D9', 'key' => 'investmentLatitude', 'aliases' => [], 'kind' => self::LATITUDE, 'required' => true, 'header' => 'Szerokość geograficzna punktu określającego lokalizację przestrzenną przedsięwzięcia deweloperskiego lub zadania inwestycyjnego'],
        ['field' => 'E1', 'key' => 'propertyType', 'aliases' => [], 'kind' => self::TEXT, 'required' => true, 'header' => 'Rodzaj nieruchomości'],
        ['field' => 'E2', 'key' => 'unit', 'aliases' => ['unitNumber'], 'kind' => self::TEXT, 'required' => true, 'header' => 'Identyfikator lokalu mieszkalnego albo domu jednorodzinnego'],
        ['field' => 'E3', 'key' => 'pricePerM2', 'aliases' => ['pricePerM2Current'], 'kind' => self::AMOUNT, 'required' => true, 'header' => 'Cena 1 m2 powierzchni użytkowej lokalu mieszkalnego albo domu jednorodzinnego'],
        ['field' => 'E4', 'key' => 'pricePerM2Date', 'aliases' => ['pricePerM2CurrentDate'], 'kind' => self::DATETIME, 'required' => true, 'header' => 'Data i czas, od których obowiązuje cena 1 m2 powierzchni użytkowej lokalu mieszkalnego albo domu jednorodzinnego'],
        ['field' => 'E5', 'key' => 'totalPrice', 'aliases' => ['totalPriceCurrent'], 'kind' => self::AMOUNT, 'required' => true, 'header' => 'Cena lokalu mieszkalnego albo domu jednorodzinnego lub ich części będących przedmiotem umowy'],
        ['field' => 'E6', 'key' => 'totalPriceDate', 'aliases' => ['totalPriceCurrentDate'], 'kind' => self::DATETIME, 'required' => true, 'header' => 'Data i czas, od których obowiązuje cena lokalu mieszkalnego albo domu jednorodzinnego lub ich części'],
        ['field' => 'F1', 'key' => 'ancillaryRoomType', 'aliases' => [], 'kind' => self::TEXT, 'required' => false, 'header' => 'Rodzaj pomieszczenia przynależnego, o którym mowa w art. 2 ust. 4 ustawy z dnia 24 czerwca 1994 r. o własności lokali'],
        ['field' => 'F2', 'key' => 'ancillaryRoomLabel', 'aliases' => [], 'kind' => self::TEXT, 'required' => false, 'header' => 'Identyfikator pomieszczenia przynależnego, o którym mowa w art. 2 ust. 4 ustawy z dnia 24 czerwca 1994 r. o własności lokali'],
        ['field' => 'F3', 'key' => 'ancillaryRoomPrice', 'aliases' => [], 'kind' => self::AMOUNT, 'required' => false, 'header' => 'Cena pomieszczenia przynależnego, o którym mowa w art. 2 ust. 4 ustawy z dnia 24 czerwca 1994 r. o własności lokali'],
        ['field' => 'F4', 'key' => 'ancillaryRoomPriceDate', 'aliases' => [], 'kind' => self::DATETIME, 'required' => false, 'header' => 'Data i czas, od których obowiązuje cena pomieszczenia przynależnego, o którym mowa w art. 2 ust. 4 ustawy z dnia 24 czerwca 1994 r. o własności lokali'],
        ['field' => 'F5', 'key' => 'ancillaryRoomUnit', 'aliases' => [], 'kind' => self::UNIT_REF, 'required' => false, 'header' => 'Identyfikator lokalu mieszkalnego albo domu jednorodzinnego dla pomieszczenia przynależnego'],
        ['field' => 'G1', 'key' => 'necessaryRights', 'aliases' => [], 'kind' => self::TEXT, 'required' => false, 'header' => 'Wyszczególnienie praw niezbędnych do korzystania z lokalu mieszkalnego albo domu jednorodzinnego'],
        ['field' => 'G2', 'key' => 'necessaryRightsValue', 'aliases' => [], 'kind' => self::AMOUNT, 'required' => false, 'header' => 'Wartość praw niezbędnych do korzystania z lokalu mieszkalnego albo domu jednorodzinnego'],
        ['field' => 'G3', 'key' => 'necessaryRightsValueDate', 'aliases' => [], 'kind' => self::DATETIME, 'required' => false, 'header' => 'Data i czas, od których obowiązuje wartość praw niezbędnych do korzystania z lokalu mieszkalnego albo domu jednorodzinnego'],
        ['field' => 'G4', 'key' => 'necessaryRightsUnit', 'aliases' => [], 'kind' => self::UNIT_REF, 'required' => false, 'header' => 'Identyfikator lokalu mieszkalnego albo domu jednorodzinnego dla prawa niezbędnego'],
        ['field' => 'H1', 'key' => 'otherPaymentsType', 'aliases' => [], 'kind' => self::TEXT, 'required' => false, 'header' => 'Wyszczególnienie rodzaju innego świadczenia pieniężnego, które nabywca jest zobowiązany spełnić na rzecz podmiotu obowiązanego w wykonaniu umowy przenoszącej własność'],
        ['field' => 'H2', 'key' => 'otherPaymentsValue', 'aliases' => [], 'kind' => self::AMOUNT, 'required' => false, 'header' => 'Wartość innego świadczenia pieniężnego, które nabywca jest zobowiązany spełnić na rzecz podmiotu obowiązanego w wykonaniu umowy przenoszącej własność'],
        ['field' => 'H3', 'key' => 'otherPaymentsValueDate', 'aliases' => [], 'kind' => self::DATETIME, 'required' => false, 'header' => 'Data i czas, od których obowiązuje wartość innego świadczenia pieniężnego, które nabywca jest zobowiązany spełnić na rzecz podmiotu obowiązanego w wykonaniu umowy przenoszącej własność'],
        ['field' => 'H4', 'key' => 'otherPaymentsUnit', 'aliases' => [], 'kind' => self::UNIT_REF, 'required' => false, 'header' => 'Identyfikator lokalu mieszkalnego albo domu jednorodzinnego dla innego świadczenia'],
    ];

    /**
     * Pola warunkowe zależne od innych ("Podaje się, jeżeli podano wartość w polu …"): pole => pole, od którego zależy.
     * Grupa F/G/H: identyfikator lokalu (F5/G4/H4) uzupełnia generator z E2, gdy grupa jest wypełniona.
     */
    public const DEPENDS_ON = [
        'F2' => 'F1', 'F3' => 'F1', 'F4' => 'F3',
        'G2' => 'G1', 'G3' => 'G2',
        'H2' => 'H1', 'H3' => 'H2',
    ];

    /** Grupa => [pierwsze pole grupy, pole identyfikatora lokalu]. */
    public const UNIT_REFS = ['F' => ['F1', 'F5'], 'G' => ['G1', 'G4'], 'H' => ['H1', 'H4']];

    /** Dopuszczalne wartości E1. */
    public const PROPERTY_TYPES = ['lokal mieszkalny', 'dom jednorodzinny'];

    /**
     * Kolumny starego rejestru (58 kolumn, 2025), których nowa struktura nie ma — przy przekształconym rejestrze nie
     * są zgłaszane jako "nieznane". Forma prawna trafia do A1 ("Firma"), kontakt do C10.
     */
    public const RETIRED = [
        'developerLegalForm', 'krs', 'krsNumber', 'ceidgNumber', 'ceidg', 'regon', 'regonNumber', 'phone', 'phoneNumber',
        'email', 'fax', 'faxNumber', 'developerWebsite', 'website', 'priceWithComponents', 'priceWithComponentsDate',
        'propertyPartType', 'partType', 'propertyPartLabel', 'partLabel', 'propertyPartPrice', 'partPrice',
        'propertyPartPriceDate', 'partPriceDate', 'prospectusUrl',
    ];

    /** @return list<string> */
    public static function headers(): array
    {
        return array_column(self::ALL, 'header');
    }
}
