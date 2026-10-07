import Link from "next/link";
import { getChildPages, getPageBySlug } from "@/lib/content";
import { unwrap } from "@/lib/editable";
import { PostCard, findBlogPostFields } from "@/components/blog/BlogPostGrid";
import Container from "./Container";
import Section from "./Section";
import H2 from "./H2";

const LATEST_POSTS_COUNT = 3;

const ctaClass =
  "group inline-flex items-center justify-center px-6 py-3 rounded-full font-poppins font-light tracking-wide bg-[#C9AB8B] text-white border border-[#C9AB8B] transition-all duration-300 hover:bg-transparent hover:text-[#C9AB8B] hover:shadow-[0_10px_30px_rgba(201,171,139,0.25)] text-center";

/**
 * Ostatnie wpisy bloga na stronie głównej — te same dane i ta sama karta co
 * siatka na /blog (BlogPostGrid.tsx): opublikowane dzieci "/blog", najnowsze
 * pierwsze. Wyliczane przy buildzie, więc nowy wpis pojawi się tu po kolejnym
 * buildzie, razem z samą stroną wpisu. Bez wpisów sekcja w ogóle się nie renderuje.
 */
export default async function LatestPosts() {
  const latest = (await getChildPages("/blog")).slice(0, LATEST_POSTS_COUNT);
  const posts = (await Promise.all(latest.map((child) => getPageBySlug(child.slug)))).filter((post) => post !== null);

  if (posts.length === 0) return null;

  return (
    <Section className="bg-[#FBFBFB]">
      <Container>
        <div id="blog" />
        <Section className="py-[32.0px] md:py-[40px] md:py-[80px]">
          <H2 reveal delay={100} className="text-center" separator>
            Z naszego bloga
          </H2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {posts.map((post, index) => (
              <PostCard
                key={post.slug}
                index={index}
                slug={post.slug}
                title={unwrap(post.title) ?? post.slug}
                updatedAt={post.updatedAt}
                fields={findBlogPostFields(post)}
                headingAs="h3"
              />
            ))}
          </div>

          <Section className="mt-[40px] flex items-center justify-center">
            <Link href="/blog" className={ctaClass}>
              Zobacz wszystkie wpisy
            </Link>
          </Section>
        </Section>
      </Container>
    </Section>
  );
}
