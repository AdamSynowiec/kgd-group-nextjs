<?php

declare(strict_types=1);

/**
 * Test bez frameworka (projekt nie ma composer.json/PHPUnit), uruchamiany ręcznie:
 *   php backend/tests/ArticleIngestTest.php
 * Sprawdza sanityzację HTML (XSS), walidację payloadu POST/PUT /blog/articles i budowę dokumentu strony (także przy aktualizacji).
 */

define('APP_ENTRY', true);

require __DIR__ . '/../src/Exception/ApiException.php';
require __DIR__ . '/../src/Exception/IngestException.php';
require __DIR__ . '/../src/Support/Slug.php';
require __DIR__ . '/../src/Support/HtmlSanitizer.php';
require __DIR__ . '/../src/Support/ArticleValidator.php';
require __DIR__ . '/../src/Support/BlogArticlePage.php';

use App\Exception\IngestException;
use App\Support\ArticleValidator;
use App\Support\BlogArticlePage;
use App\Support\HtmlSanitizer;

$failures = [];

function check(string $name, mixed $actual, mixed $expected): void
{
    global $failures;
    $ok = $actual === $expected;
    echo ($ok ? "PASS" : "FAIL") . " - {$name}\n";
    if (!$ok) {
        $failures[] = $name;
        echo "  expected: " . json_encode($expected) . "\n";
        echo "  actual:   " . json_encode($actual) . "\n";
    }
}

/** @return array<string, string> błędy pól albo [] gdy payload przeszedł */
function fieldErrors(array $payload): array
{
    try {
        ArticleValidator::validate($payload);
        return [];
    } catch (IngestException $exception) {
        return $exception->fields;
    }
}

function valid(array $override = []): array
{
    return $override + [
        'slug' => '/blog/przykladowy-artykul',
        'meta_title' => 'Przykładowy tytuł artykułu',
        'meta_desc' => 'Meta description artykułu, dość długa.',
        'keyword' => 'keyword',
        'publish_date' => '2020-01-01T10:00:00+02:00',
        'content' => '<p>Wprowadzenie</p><h2>Nagłówek</h2><p>Treść</p>',
    ];
}

// --- HtmlSanitizer -----------------------------------------------------------

check('keeps allowed markup', HtmlSanitizer::sanitize('<p>a <strong>b</strong> <em>c</em></p><h2>H</h2>'), '<p>a <strong>b</strong> <em>c</em></p><h2>H</h2>');
check('drops script with its content', HtmlSanitizer::sanitize('<p>x</p><script>alert(1)</script>'), '<p>x</p>');
check('drops iframe/object/embed/noscript/template with content', HtmlSanitizer::sanitize('<iframe src="x">i</iframe><object>o</object><embed src="x"><noscript>n</noscript><template>t</template><p>ok</p>'), '<p>ok</p>');
check('unwraps form/input/button, keeps text', HtmlSanitizer::sanitize('<form><input value="v"><button>Klik</button></form>'), 'Klik');
check('removes event handlers', HtmlSanitizer::sanitize('<p onclick="x()" onmouseover="y()">t</p>'), '<p>t</p>');
check('keeps class and safe style', HtmlSanitizer::sanitize('<p class="c" style="color:red;margin-top:4px">t</p>'), '<p class="c" style="color:red; margin-top:4px">t</p>');
check('style: drops url() declaration, keeps the rest', HtmlSanitizer::sanitize('<p style="color:red;background:url(https://x.pl/t.png)">t</p>'), '<p style="color:red">t</p>');
check('style: drops expression()/javascript:/@import/backslash', HtmlSanitizer::sanitize('<p style="width:expression(alert(1));background:javascript:x;behavior:url(a);color:\\72ed">t</p>'), '<p>t</p>');
check('style: fully unsafe style attribute removed', HtmlSanitizer::sanitize('<p style="background-image:url(x)">t</p>'), '<p>t</p>');
check('keeps layout elements with classes', HtmlSanitizer::sanitize('<section class="a"><div class="b"><span class="c">t</span></div></section>'), '<section class="a"><div class="b"><span class="c">t</span></div></section>');
check('keeps h1', HtmlSanitizer::sanitize('<h1 class="x">T</h1>'), '<h1 class="x">T</h1>');
check('<style> block: kept, ">" selectors and @media intact', HtmlSanitizer::sanitize('<style>.a > p{color:red}@media (min-width:640px){.a{margin:0}}</style><p>x</p>'), '<style>.a > p{color:red}@media (min-width:640px){.a{margin:0}}</style><p>x</p>');
check('<style> block with url() dropped entirely', HtmlSanitizer::sanitize('<style>a{background:url(https://x.pl/t.png)}</style><p>x</p>'), '<p>x</p>');
check('<style> block with @import dropped entirely', HtmlSanitizer::sanitize('<style>@import "https://x.pl/a.css";</style><p>x</p>'), '<p>x</p>');
check('<style> block with backslash escape dropped entirely', HtmlSanitizer::sanitize('<style>a{background:u\\72l(x)}</style><p>x</p>'), '<p>x</p>');
check('<style> inside svg cannot smuggle markup', str_contains(HtmlSanitizer::sanitize('<svg><style><a title="</style><img src=x onerror=alert(1)>">x</style></svg>'), 'onerror'), false);
$svgIcon = HtmlSanitizer::sanitize('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor"><path stroke-linecap="round" d="M5 13l4 4L19 7"/></svg>');
foreach (['<svg ', 'class="h-6 w-6"', 'stroke="currentColor"', 'd="M5 13l4 4L19 7"', '</svg>'] as $part) {
    check("svg icon keeps: {$part}", str_contains($svgIcon, $part), true);
}
$svgUnsafe = HtmlSanitizer::sanitize('<svg onload="x()"><script>x</script><use href="#a"></use><foreignObject><p>t</p></foreignObject><a xlink:href="javascript:x">l</a><path d="M0" fill="url(javascript:x)" onclick="y()"/></svg>');
foreach (['onload', 'onclick', '<script', '<use', 'javascript', 'xlink', 'foreignobject', 'url('] as $part) {
    check("svg unsafe parts removed: {$part}", str_contains(strtolower($svgUnsafe), $part), false);
}
check('math still dropped with content', HtmlSanitizer::sanitize('<p>a</p><math><mi>x</mi></math>'), '<p>a</p>');
check('article is kept', HtmlSanitizer::sanitize('<article class="a"><p>x</p></article>'), '<article class="a"><p>x</p></article>');
check('keeps tailwind classes incl. variants and arbitrary values', HtmlSanitizer::sanitize('<h2 class="text-3xl md:text-4xl w-[calc(100%-2rem)] hover:bg-red-500/50">t</h2>'), '<h2 class="text-3xl md:text-4xl w-[calc(100%-2rem)] hover:bg-red-500/50">t</h2>');
check('keeps class on links, lists and tables', HtmlSanitizer::sanitize('<ul class="a"><li class="b"><a class="c" href="/x">t</a></li></ul><table class="d"><tr><td class="e">1</td></tr></table>'), '<ul class="a"><li class="b"><a class="c" href="/x">t</a></li></ul><table class="d"><tr><td class="e">1</td></tr></table>');
check('class value cannot break out of the attribute', HtmlSanitizer::sanitize('<p class="a&quot; onclick=&quot;x()">t</p>'), '<p class="a&quot; onclick=&quot;x()">t</p>');
check('keeps id like class', HtmlSanitizer::sanitize('<h2 id="sekcja-1" class="c">t</h2>'), '<h2 id="sekcja-1" class="c">t</h2>');
check('keeps id on svg elements', HtmlSanitizer::sanitize('<svg id="ikona"><path id="p1" d="M0"/></svg>'), '<svg id="ikona"><path id="p1" d="M0"></path></svg>');
check('id value cannot break out of the attribute', HtmlSanitizer::sanitize('<p id="a&quot; onclick=&quot;x()">t</p>'), '<p id="a&quot; onclick=&quot;x()">t</p>');
check('other attributes (data-*, name) still removed', HtmlSanitizer::sanitize('<p id="i" data-x="1" name="n" class="c">t</p>'), '<p id="i" class="c">t</p>');
check('keeps https/http/mailto links', HtmlSanitizer::sanitize('<a href="https://a.pl" title="t">x</a>'), '<a href="https://a.pl" title="t">x</a>');
check('keeps mailto link', HtmlSanitizer::sanitize('<a href="mailto:a@b.pl">x</a>'), '<a href="mailto:a@b.pl">x</a>');
check('keeps relative link', HtmlSanitizer::sanitize('<a href="/kontakt">x</a>'), '<a href="/kontakt">x</a>');
check('drops javascript: href', HtmlSanitizer::sanitize('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
check('drops obfuscated javascript: href', HtmlSanitizer::sanitize("<a href=\"  jAva\tScript:alert(1)\">x</a>"), '<a>x</a>');
check('no executable javascript: href from entity-encoded colon', str_contains(HtmlSanitizer::sanitize('<a href="javascript&colon;alert(1)">x</a>'), 'href="javascript:'), false);
check('drops data: href', HtmlSanitizer::sanitize('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>'), '<a>x</a>');
check('drops vbscript: href', HtmlSanitizer::sanitize('<a href="vbscript:msgbox(1)">x</a>'), '<a>x</a>');
check('img: keeps safe src/alt, drops onerror', HtmlSanitizer::sanitize('<p>a<img src="/u/x.jpg" alt="Foto" onerror="alert(1)">b</p>'), '<p>a<img src="/u/x.jpg" alt="Foto">b</p>');
check('img: drops javascript:/data: src', HtmlSanitizer::sanitize('<p>a<img src="javascript:alert(1)">b<img src="data:image/svg+xml;base64,AAAA">c</p>'), '<p>abc</p>');
check('img: drops image without src', HtmlSanitizer::sanitize('<p>a<img alt="x">b</p>'), '<p>ab</p>');
check('escapes text that looks like markup', HtmlSanitizer::sanitize('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
check('keeps table structure', HtmlSanitizer::sanitize('<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>'), '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>');
check('keeps polish characters', HtmlSanitizer::sanitize('<p>Zażółć gęślą jaźń</p>'), '<p>Zażółć gęślą jaźń</p>');

// --- pełny przykład od partnera (Tailwind UI, sekcja hero) -------------------

$example = <<<'HTML'
<section class="bg-white lg:grid lg:h-screen lg:place-content-center"> <div class="mx-auto w-screen max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32"> <div class="mx-auto max-w-prose text-center"> <h1 class="text-4xl font-bold text-gray-900 sm:text-5xl"> Understand user flow and <strong class="text-indigo-600"> increase </strong> conversions </h1> <p class="mt-4 text-base text-pretty text-gray-700 sm:text-lg/relaxed"> Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eaque, nisi. Natus, provident accusamus impedit minima harum corporis iusto. </p> <div class="mt-4 flex justify-center gap-4 sm:mt-6"> <a class="inline-block rounded border border-indigo-600 bg-indigo-600 px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700" href="#" > Get Started </a> <a class="inline-block rounded border border-gray-200 px-5 py-3 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900" href="#" > Learn More </a> </div> </div> </div> </section>
HTML;

$sanitizedExample = HtmlSanitizer::sanitize($example);
foreach ([
    '<section class="bg-white lg:grid lg:h-screen lg:place-content-center">',
    '<div class="mx-auto w-screen max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">',
    '<div class="mx-auto max-w-prose text-center">',
    '<h1 class="text-4xl font-bold text-gray-900 sm:text-5xl">',
    '<strong class="text-indigo-600">',
    '<p class="mt-4 text-base text-pretty text-gray-700 sm:text-lg/relaxed">',
    '<div class="mt-4 flex justify-center gap-4 sm:mt-6">',
    '<a class="inline-block rounded border border-indigo-600 bg-indigo-600 px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700" href="#">',
    '<a class="inline-block rounded border border-gray-200 px-5 py-3 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900" href="#">',
] as $fragment) {
    check("example keeps: {$fragment}", str_contains($sanitizedExample, $fragment), true);
}
check('example passes validation unchanged in structure', fieldErrors(valid(['content' => $example])), []);

// --- ArticleValidator --------------------------------------------------------

check('valid payload passes', fieldErrors(valid()), []);
check('slug without leading slash is accepted', fieldErrors(valid(['slug' => 'blog/moj-wpis'])), []);
check('keyword is optional', fieldErrors(array_diff_key(valid(), ['keyword' => 1])), []);
check('fractional seconds + Z accepted', fieldErrors(valid(['publish_date' => '2026-09-20T08:00:00.123Z'])), []);

check('missing required fields reported together', array_keys(fieldErrors([])), ['slug', 'meta_title', 'meta_desc', 'publish_date', 'content']);
check('unknown field rejected', array_keys(fieldErrors(valid(['status' => 'published']))), ['status']);
check('slug outside /blog rejected', array_keys(fieldErrors(valid(['slug' => '/o-nas']))), ['slug']);
check('nested slug rejected', array_keys(fieldErrors(valid(['slug' => '/blog/a/b']))), ['slug']);
check('slug with polish letters rejected', array_keys(fieldErrors(valid(['slug' => '/blog/żółć']))), ['slug']);
check('reserved slug /blog/page rejected', array_keys(fieldErrors(valid(['slug' => '/blog/page']))), ['slug']);
check('cover_image absolute https accepted', fieldErrors(valid(['cover_image' => 'https://cdn.example.com/a/foto.jpg'])), []);
check('cover_image site path accepted', fieldErrors(valid(['cover_image' => '/uploads/foto.jpg'])), []);
check('cover_image javascript: rejected', array_keys(fieldErrors(valid(['cover_image' => 'javascript:alert(1)']))), ['cover_image']);
check('cover_image data: rejected', array_keys(fieldErrors(valid(['cover_image' => 'data:image/png;base64,AAAA']))), ['cover_image']);
check('cover_image protocol-relative rejected', array_keys(fieldErrors(valid(['cover_image' => '//evil.example/x.jpg']))), ['cover_image']);
check('cover_image plain text rejected', array_keys(fieldErrors(valid(['cover_image' => 'foto.jpg']))), ['cover_image']);
check('meta_title too short', array_keys(fieldErrors(valid(['meta_title' => 'ab']))), ['meta_title']);
check('meta_title with html rejected', array_keys(fieldErrors(valid(['meta_title' => 'Tytuł <b>x</b>']))), ['meta_title']);
check('non-string meta_desc rejected', array_keys(fieldErrors(valid(['meta_desc' => 123]))), ['meta_desc']);
check('date without offset rejected', array_keys(fieldErrors(valid(['publish_date' => '2026-09-20T10:00:00']))), ['publish_date']);
check('date-only rejected', array_keys(fieldErrors(valid(['publish_date' => '2026-09-20']))), ['publish_date']);
check('non-existent date rejected', array_keys(fieldErrors(valid(['publish_date' => '2026-02-30T10:00:00Z']))), ['publish_date']);
check('empty content rejected', array_keys(fieldErrors(valid(['content' => '']))), ['content']);
check('content empty after sanitization rejected', array_keys(fieldErrors(valid(['content' => '<script>alert(1)</script>']))), ['content']);
check('full html document rejected', array_keys(fieldErrors(valid(['content' => '<html><body><p>x</p></body></html>']))), ['content']);
check('style-only content counts as empty', array_keys(fieldErrors(valid(['content' => '<style>.a{color:red}</style>']))), ['content']);
check('<main> wrapper rejected', array_keys(fieldErrors(valid(['content' => '<main><p>x</p></main>']))), ['content']);
check('<article> wrapper accepted', fieldErrors(valid(['content' => '<article><p>x</p></article>'])), []);
check('<style> + svg content accepted', fieldErrors(valid(['content' => '<style>.a{color:red}</style><svg viewBox="0 0 1 1"><path d="M0"/></svg><p>x</p>'])), []);
check('oversized content rejected', array_keys(fieldErrors(valid(['content' => str_repeat('a', 200001)]))), ['content']);

// --- normalizacja i dokument strony ------------------------------------------

$article = ArticleValidator::validate(valid(['slug' => 'blog/moj-wpis', 'content' => '<p>Ok</p><script>x</script>']));
check('slug normalized to canonical form', $article['slug'], '/blog/moj-wpis');
check('content stored sanitized', $article['content'], '<p>Ok</p>');

$page = BlogArticlePage::build($article);
check('past publish_date -> published', $page['status'], 'published');
check('future publish_date -> draft', BlogArticlePage::build(ArticleValidator::validate(valid(['publish_date' => '2099-01-01T00:00:00Z'])))['status'], 'draft');
check('updatedAt is the Warsaw calendar day', BlogArticlePage::build(ArticleValidator::validate(valid(['publish_date' => '2026-09-20T23:30:00Z'])))['updatedAt'], '2026-09-21');
check('cover_image lands in coverImage field', BlogArticlePage::build(ArticleValidator::validate(valid(['cover_image' => '/uploads/foto.jpg'])))['sections'][0]['fields']['coverImage']['value'], '/uploads/foto.jpg');
check('missing cover_image -> empty coverImage', $page['sections'][0]['fields']['coverImage']['value'], '');
check('page is a blog child with editor acl', [$page['parent'], $page['template'], $page['acl']['role']], ['/blog', 'blog-post', 'blog']);
check('body is a richtext field', $page['sections'][0]['fields']['body']['type'], 'richtext');

// --- aktualizacja (PUT) --------------------------------------------------------

$existing = $page;
$existing['acl'] = ['role' => 'redakcja', 'permission' => 'read/write'];
$existing['sections'][0]['fields']['excerpt']['value'] = 'Zajawka z panelu';
$existing['sections'][0]['fields']['author']['value'] = 'Jan Kowalski';
$existing['sections'][0]['fields']['tags']['value'] = ['a', 'b'];
$existing['sections'][0]['fields']['body']['value'] = '<p>Stara treść</p>';

$updated = BlogArticlePage::rebuild(ArticleValidator::validate(valid([
    'slug' => '/blog/moj-wpis',
    'meta_title' => 'Nowy tytuł',
    'content' => '<h2 id="nowa">Nowa</h2><p>Nowa treść</p>',
    'cover_image' => '/uploads/nowe.jpg',
])), $existing);
$fields = $updated['sections'][0]['fields'];
check('update: body replaced', $fields['body']['value'], '<h2 id="nowa">Nowa</h2><p>Nowa treść</p>');
check('update: title and seo replaced', [$updated['title']['value'], $updated['seo']['title']['value']], ['Nowy tytuł', 'Nowy tytuł']);
check('update: cover replaced', $fields['coverImage']['value'], '/uploads/nowe.jpg');
check('update: panel-only fields kept', [$fields['excerpt']['value'], $fields['author']['value'], $fields['tags']['value']], ['Zajawka z panelu', 'Jan Kowalski', ['a', 'b']]);
check('update: acl kept', $updated['acl'], ['role' => 'redakcja', 'permission' => 'read/write']);
check('update: status recomputed from publish_date', BlogArticlePage::rebuild(ArticleValidator::validate(valid(['publish_date' => '2099-01-01T00:00:00Z'])), $existing)['status'], 'draft');
check('update: missing cover_image clears cover', BlogArticlePage::rebuild(ArticleValidator::validate(valid()), $existing)['sections'][0]['fields']['coverImage']['value'], '');
check('update: keyword omitted -> no keywords', array_key_exists('keywords', BlogArticlePage::rebuild(ArticleValidator::validate(array_diff_key(valid(), ['keyword' => 1])), $existing)['seo']), false);
check('update: page without BlogPost section falls back to defaults', BlogArticlePage::rebuild(ArticleValidator::validate(valid()), ['template' => 'blog-post'])['sections'][0]['fields']['excerpt']['value'], '');
check('update: page without acl gets default blog acl', BlogArticlePage::rebuild(ArticleValidator::validate(valid()), [])['acl']['role'], 'blog');

echo "\n" . (count($failures) === 0 ? "ALL PASS" : count($failures) . " FAILED: " . implode(', ', $failures)) . "\n";
exit(count($failures) === 0 ? 0 : 1);
