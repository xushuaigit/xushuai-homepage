import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Mail,
  Phone,
} from 'lucide-react';
import type { Metadata } from 'next';

import { appleHomepage as homepageDemo } from '../lib/apple-homepage';
import styles from './apple.module.css';
import BackToTop from './back-to-top';

export const metadata: Metadata = {
  title: `${homepageDemo.name} · 个人网站`,
  description: `${homepageDemo.name}的个人网站：企业级 PMO、规模化敏捷与 AI Agent 业务落地。`,
  robots: { index: false, follow: false },
};

const methodSteps = [
  {
    title: '业务牵引产研',
    label: '01 / 目标与优先级',
    lines: [
      '从业务与市场目标出发，',
      '明确产品优先级，',
      '让研发投入对齐交付目标。',
    ],
  },
  {
    title: '按业务流组队',
    label: '02 / 团队责任',
    lines: [
      '围绕业务流组建特性团队，',
      '让产品、研发、测试稳定协作，',
      '承担端到端交付。',
    ],
  },
  {
    title: '跨团队解依赖',
    label: '03 / 协同机制',
    lines: [
      '团队内自主闭环；',
      '跨团队的依赖与风险，',
      '按共同优先级和固定节奏处理。',
    ],
  },
] as const;

const homepageChapters = [
  {
    href: '#about',
    title: '关于我',
    description: '职业经历与当前方向',
  },
  {
    href: '#approach',
    title: '工作方式',
    description: '目标、团队、协同与透明',
  },
  {
    href: '#stories',
    title: '代表实践',
    description: '产研治理与 AI 业务落地',
  },
] as const;

const careerFocus: Record<string, string> = {
  consultant: '产研流程治理与 AI Agent 业务落地',
  porsche: '规模化敏捷与跨团队协同',
  dingdong: '公司级项目交付、项目管理与协作体系建设',
  aotu: '企业级 PMO 建设',
  dada: '项目管理与多团队协作',
};

const careerHighlights = homepageDemo.experience.map((experience) => ({
  organization: experience.organization,
  focus: careerFocus[experience.id],
}));

const organizationDisplayNames: Record<string, string> = {
  '保时捷数字科技（项目）': '保时捷数字科技',
};

const storyTitleTerms: Record<string, readonly string[]> = {
  'enterprise-pmo': ['让特性团队', '对齐业务流，', '自主交付'],
  'art-delivery': ['让团队与团队，', '围绕共同目标', '协同交付'],
  'ai-workflow': ['让 AI 从方案，', '进入每天的工作'],
  'staged-delivery': ['先交付核心能力，', '把握业务窗口'],
  'retail-governance': ['从研发迭代，', '逐步连起', '业务与产品'],
};

function StoryTitle({
  title,
  terms,
}: {
  title: string;
  terms: readonly string[];
}) {
  const parts: { text: string; unbroken: boolean }[] = [];
  let offset = 0;

  while (offset < title.length) {
    const next = terms
      .filter(Boolean)
      .map((text) => ({ text, index: title.indexOf(text, offset) }))
      .filter((match) => match.index >= 0)
      .sort((a, b) => a.index - b.index || b.text.length - a.text.length)[0];
    if (!next) break;
    parts.push({ text: title.slice(offset, next.index), unbroken: false });
    parts.push({ text: next.text, unbroken: true });
    offset = next.index + next.text.length;
  }
  parts.push({ text: title.slice(offset), unbroken: false });

  return (
    <>
      {parts.map((part, index) => (
        <span
          key={index}
          className={part.unbroken ? styles.unbrokenTerm : undefined}
        >
          {part.text}
        </span>
      ))}
    </>
  );
}

const readingTerms = [
  'AI Agent',
  'AI 应用',
  '产研 AI 化',
  '新人 AI 陪练',
  '和新人 AI 陪练',
  '企业级 PMO',
  '虚拟 PMO',
  'Scrum@Scale',
  'ART 级 RTE',
  'PI Planning',
  '产品优先级',
  '双层优先级',
  '项目管理体系',
  '研发效能度量',
  'S 级项目',
  '市场窗口',
  '高并发',
  '提高并发',
  '大促保障',
  'Redis 改造',
  '大数据／供应链',
  '分阶段交付',
  '首次 MVP 上线',
  '前置仓',
  '精准补货',
  '货物浪费与损耗',
  '浪费与损耗',
  '特性团队',
  '业务流',
  '端到端交付',
  '跨团队',
  '需求流转',
  '销售情报整理',
  '分工与协作',
  '工作方式',
  '用得起来',
  '着眼于',
  '实际变化',
  '业务工作中',
  '目标是否一致',
  '责任是否落到团队',
  '依赖能否及时闭环',
  '执行者的直觉',
  '让改变能够持续',
  '独立顾问',
  '协作场景',
  '协作场景中',
  '交付方法',
  '规模化敏捷',
  '客户名称',
  '理解需求',
  '用户视角',
] as const;

function CopyLines({
  lines,
  terms = [],
  omitEndPunctuation = false,
}: {
  lines: readonly string[];
  terms?: readonly string[];
  omitEndPunctuation?: boolean;
}) {
  return lines.map((line, index) => (
    <span className={styles.copySentence} key={index}>
      <StoryTitle
        title={omitEndPunctuation ? line.replace(/[，。]+$/u, '') : line}
        terms={[...readingTerms, ...terms]}
      />
    </span>
  ));
}

function SentenceCopy({
  text,
  terms,
  omitEndPunctuation,
  splitSemicolons = false,
}: {
  text: string;
  terms?: readonly string[];
  omitEndPunctuation?: boolean;
  splitSemicolons?: boolean;
}) {
  const sentences = text.match(/[^。\uFF01\uFF1F]+[。\uFF01\uFF1F]?/gu) ?? [
    text,
  ];

  return (
    <CopyLines
      lines={
        splitSemicolons
          ? sentences.flatMap((sentence) =>
              sentence.split(/(?<=；)/u).filter(Boolean),
            )
          : sentences
      }
      terms={terms}
      omitEndPunctuation={omitEndPunctuation}
    />
  );
}

function SectionArrow() {
  return (
    <ArrowDown
      className={styles.sectionArrow}
      size={18}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}

export default function AppleDemoPage() {
  return (
    <div className={styles.page} data-apple-demo lang="zh-CN">
      <a className={styles.skipLink} href="#content">
        跳到主要内容
      </a>

      <header className={styles.header}>
        <div className={styles.navShell}>
          <a
            className={styles.brand}
            href="#content"
            aria-label={`${homepageDemo.name}的个人主页，返回顶部`}
          >
            {homepageDemo.name}
          </a>
          <nav className={styles.nav} aria-label="页面导航">
            <a href="#about">关于我</a>
            <a href="#approach">工作方式</a>
            <a href="#stories">代表实践</a>
          </nav>
          <a className={styles.navAction} href="#contact">
            联系我
          </a>
        </div>
      </header>

      <main id="content">
        <div className={styles.firstScreen}>
          <section className={styles.hero} aria-labelledby="hero-title">
            <div className={styles.heroGlow} aria-hidden="true" />
            <div className={styles.heroInner}>
              <h1 id="hero-title">
                <span className={styles.heroStatement}>
                  <span className={styles.heroClause}>从业务问题出发</span>
                  <span className={styles.heroClause}>让产研协作有序</span>
                </span>
                <span className={styles.heroOutcome}>
                  <span className={styles.heroClause}>看清进展与风险</span>
                  <span className={styles.heroClause}>让业务从改善中受益</span>
                </span>
              </h1>
              <div className={styles.heroContext}>
                <p className={styles.heroCopy}>
                  <SentenceCopy
                    text="我从业务问题出发，推动业产研一体化，让业务目标贯穿产品决策与研发交付。理清优先级与团队责任，让管理层掌握进展与风险，也为数字化打好协作基础。"
                    terms={[
                      '业产研一体化',
                      '产品决策',
                      '研发交付',
                      '优先级',
                      '团队责任',
                      '进展与风险',
                      '数字化',
                    ]}
                  />
                </p>
                <p className={styles.heroCopy}>
                  <SentenceCopy
                    text="AI 应用也从具体业务工作切入，着眼于减少重复劳动、缩短处理时间。成效如何，最终看业务工作中的实际变化。"
                    terms={['减少重复劳动', '缩短处理时间']}
                  />
                </p>
              </div>
              <nav className={styles.heroChapters} aria-label="首页内容导览">
                {homepageChapters.map((chapter) => (
                  <a
                    className={styles.heroChapter}
                    href={chapter.href}
                    key={chapter.href}
                  >
                    <span className={styles.heroChapterTitle}>
                      {chapter.title}
                    </span>
                    <span className={styles.heroChapterDescription}>
                      {chapter.description}
                    </span>
                    <SectionArrow />
                  </a>
                ))}
              </nav>
            </div>
          </section>

          <section
            id="about"
            className={styles.about}
            aria-labelledby="about-title"
          >
            <div className={`${styles.sectionShell} ${styles.aboutGrid}`}>
              <div className={styles.aboutIntro}>
                <p className={styles.sectionLabel}>关于我</p>
                <h2 id="about-title">
                  你好，我是<span className={styles.unbrokenTerm}>徐帅</span>
                </h2>
                <p className={styles.aboutRole}>
                  资深 PMO、敏捷教练，
                  <span className={styles.unbrokenTerm}>现为独立顾问。</span>
                </p>
                <div className={styles.aboutBio}>
                  <p>
                    <SentenceCopy text="我习惯先弄清业务目标，再和团队一起理顺分工与协作。流程要贴近实际的工作方式，团队才用得起来。" />
                  </p>
                  <p>
                    <CopyLines
                      lines={[
                        '最近关注产研 AI 化，也在参与',
                        '需求流转、销售情报整理和新人 AI 陪练等场景的建设。',
                      ]}
                    />
                  </p>
                </div>
                <div className={styles.aboutActions}>
                  <a href="#stories" className={styles.aboutPrimary}>
                    看项目实践
                    <SectionArrow />
                  </a>
                  <a href="#contact" className={styles.aboutSecondary}>
                    聊聊合作
                    <SectionArrow />
                  </a>
                </div>
              </div>
              <aside
                className={styles.aboutCareer}
                aria-labelledby="career-title"
              >
                <h3 id="career-title">职业经历</h3>
                <ol className={styles.careerList}>
                  {careerHighlights.map((experience) => (
                    <li key={experience.organization}>
                      <strong>
                        {organizationDisplayNames[experience.organization] ??
                          experience.organization}
                      </strong>
                      <span>
                        <StoryTitle
                          title={experience.focus}
                          terms={[
                            'AI Agent',
                            '业务落地',
                            '公司级项目交付',
                            '项目管理',
                            '协作体系建设',
                          ]}
                        />
                      </span>
                    </li>
                  ))}
                </ol>
                <a className={styles.careerLink} href="#career">
                  查看完整经历与专业背景
                  <SectionArrow />
                </a>
              </aside>
            </div>
          </section>
        </div>

        <section
          id="approach"
          className={styles.approach}
          aria-labelledby="approach-title"
        >
          <div className={styles.sectionShell}>
            <p className={styles.sectionLabel}>工作方式</p>
            <h2 id="approach-title">
              <span className={styles.headingClause}>从看见问题，</span>
              <span className={styles.headingClause}>到让改变真正发生</span>
            </h2>
            <p className={styles.leadCopy}>
              <SentenceCopy text="目标是否一致，责任是否落到团队，依赖能否及时闭环。再把流程设计得符合执行者的直觉，让改变能够持续。" />
            </p>

            <div
              className={styles.signalGrid}
              aria-label="从目标到协同的三个工作步骤"
            >
              {methodSteps.map((step) => (
                <article key={step.label}>
                  <p className={styles.signalEyebrow}>{step.label}</p>
                  <h3 className={styles.signalTitle}>{step.title}</h3>
                  <p className={styles.signalDescription}>
                    <CopyLines lines={step.lines} terms={['交付目标']} />
                  </p>
                </article>
              ))}
            </div>

            <article
              id="verification"
              className={styles.improvement}
              aria-labelledby="improvement-title"
            >
              <div className={styles.improvementIntro}>
                <p className={styles.improvementEyebrow}>04 / 信息透明</p>
                <h3 id="improvement-title">让协作信息透明</h3>
                <p>
                  <span className={styles.unbrokenTerm}>
                    资源有数，事项有主；
                  </span>
                  <span className={styles.unbrokenTerm}>
                    进度可查，风险可追。
                  </span>
                </p>
              </div>
              <dl
                className={styles.transparencyList}
                aria-label="透明的协作信息"
              >
                <div>
                  <dt>资源配置</dt>
                  <dd>
                    <span className={styles.unbrokenTerm}>团队容量</span>与
                    <span className={styles.unbrokenTerm}>需求工作量</span>
                  </dd>
                </div>
                <div>
                  <dt>需求事项</dt>
                  <dd>
                    <span className={styles.unbrokenTerm}>优先级</span>与
                    <span className={styles.unbrokenTerm}>责任归属</span>
                  </dd>
                </div>
                <div>
                  <dt>交付进展</dt>
                  <dd>
                    <span className={styles.unbrokenTerm}>计划、版本</span>与
                    <span className={styles.unbrokenTerm}>验收状态</span>
                  </dd>
                </div>
                <div>
                  <dt>风险依赖</dt>
                  <dd>
                    <span className={styles.unbrokenTerm}>跨团队同步</span>与
                    <span className={styles.unbrokenTerm}>闭环</span>
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <section
          id="stories"
          className={styles.stories}
          aria-labelledby="stories-title"
        >
          <div className={styles.sectionShell}>
            <div className={styles.storiesHeading}>
              <p className={styles.sectionLabel}>代表实践</p>
              <h2 id="stories-title">
                <span className={styles.storyHeadingPhrase}>产研治理与</span>{' '}
                <span className={styles.storyHeadingPhrase}>AI 业务落地</span>
              </h2>
              <p className={styles.storiesIntro}>
                <SentenceCopy
                  text="先理清治理基础，再把流程和交付机制跑顺，最后让 AI 进入具体业务工作。"
                  terms={['治理基础', '流程和交付机制', '具体业务工作']}
                />
              </p>
            </div>

            <nav className={styles.storyCategories} aria-label="实践主线">
              <ol>
                {homepageDemo.practiceLayers.map((layer, index) => (
                  <li key={layer.id}>
                    <a href={`#stories-${layer.id}`}>
                      <span className={styles.storyPathNumber}>
                        {layer.number}
                      </span>
                      <span>{layer.title}</span>
                    </a>
                    {index < homepageDemo.practiceLayers.length - 1 && (
                      <ArrowRight
                        className={styles.storyPathArrow}
                        size={18}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            <div className={styles.storyGroups}>
              {homepageDemo.practiceLayers.map((layer) => (
                <section
                  className={styles.storyGroup}
                  id={`stories-${layer.id}`}
                  aria-labelledby={`stories-${layer.id}-title`}
                  key={layer.id}
                >
                  <div className={styles.storyGroupHeading}>
                    <h3 id={`stories-${layer.id}-title`}>
                      <span className={styles.storyGroupNumber}>
                        {layer.number}
                      </span>
                      <span>{layer.title}</span>
                    </h3>
                    <p>
                      <SentenceCopy
                        text={layer.description}
                        terms={[
                          '治理基础',
                          '业务目标',
                          '组织责任',
                          '需求承接',
                          '研发迭代',
                          '固定发版',
                          '导入敏捷',
                          '团队流程',
                          '协作流程',
                          'AI 工作流',
                          'PoC 验证',
                          '日常使用',
                        ]}
                      />
                    </p>
                  </div>
                  <div className={styles.storyList}>
                    {homepageDemo.cases
                      .filter((story) => story.layer === layer.id)
                      .map((story) => (
                        <article
                          className={styles.story}
                          id={story.id}
                          key={story.id}
                        >
                          <div className={styles.storyMeta}>
                            <p>
                              <StoryTitle
                                title={story.label}
                                terms={['AI Agent', '业务落地']}
                              />
                            </p>
                            <small>
                              <StoryTitle
                                title={
                                  organizationDisplayNames[
                                    story.organization
                                  ] ?? story.organization
                                }
                                terms={[
                                  '保时捷数字科技',
                                  '独立顾问',
                                  '跨境电商客户',
                                ]}
                              />
                            </small>
                          </div>
                          <div className={styles.storyBody}>
                            <h4>
                              <StoryTitle
                                title={story.title.replace(/[，。]+$/u, '')}
                                terms={storyTitleTerms[story.id]}
                              />
                            </h4>
                            <p>
                              <span className={styles.storyFieldLabel}>
                                问题
                              </span>
                              <SentenceCopy text={story.problem} />
                            </p>
                            <p>
                              <span className={styles.storyFieldLabel}>
                                行动
                              </span>
                              <SentenceCopy
                                text={story.contribution}
                                terms={[
                                  'Scrum@Scale',
                                  'ART 级 RTE',
                                  '新人 AI 陪练。',
                                ]}
                                splitSemicolons
                              />
                            </p>
                            <strong>
                              <span className={styles.storyFieldLabel}>
                                结果
                              </span>
                              <SentenceCopy
                                text={story.result}
                                terms={[
                                  '80%',
                                  '3–6 个月',
                                  '7 个工作日',
                                  '14 个工作日',
                                  '4 个工作日',
                                  '85%–90%',
                                  '1 小时',
                                  '10 分钟',
                                ]}
                              />
                            </strong>
                          </div>
                          <a
                            className={styles.storyAction}
                            href="#contact"
                            aria-label={`交流「${story.label}」实践`}
                            title="交流这一实践"
                          >
                            <SectionArrow />
                          </a>
                        </article>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section
          id="career"
          className={styles.career}
          aria-labelledby="career-detail-title"
        >
          <div className={styles.sectionShell}>
            <p className={styles.sectionLabel}>经历与专业背景</p>
            <h2 id="career-detail-title">
              <span className={styles.headingClause}>在不同场景中，</span>
              <span className={styles.headingClause}>持续验证交付方法</span>
            </h2>
            <p className={styles.leadCopy}>
              <CopyLines
                lines={homepageDemo.careerIntroduction
                  .replace('再以独立顾问方式', '\n再以独立顾问方式')
                  .split(/\n|(?<=。)/u)
                  .filter(Boolean)}
              />
            </p>
            <div className={styles.experienceList}>
              {homepageDemo.experience.map((experience) => (
                <details
                  className={styles.experience}
                  id={`career-${experience.id}`}
                  key={experience.id}
                >
                  <summary>
                    <span className={styles.experiencePeriod}>
                      {experience.period}
                    </span>
                    <span className={styles.experienceHeading}>
                      <strong>{experience.organization}</strong>
                      <span>
                        <StoryTitle
                          title={experience.title}
                          terms={readingTerms}
                        />
                      </span>
                    </span>
                    <ChevronDown
                      className={styles.experienceChevron}
                      size={22}
                      aria-hidden="true"
                    />
                  </summary>
                  <div className={styles.experienceBody}>
                    <p>
                      <SentenceCopy text={experience.summary} />
                    </p>
                    <dl>
                      {experience.details.map((detail) => (
                        <div key={detail.label}>
                          <dt>{detail.label}</dt>
                          <dd>
                            <SentenceCopy text={detail.text} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </details>
              ))}
            </div>
            <div className={styles.backgroundGrid}>
              <div>
                <h3>专业认证</h3>
                <ul>
                  {homepageDemo.certifications.map((certification) => (
                    <li key={certification}>{certification}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>教育与语言</h3>
                <p>{homepageDemo.education}</p>
                <p>{homepageDemo.language}</p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="contact"
          className={styles.contact}
          aria-labelledby="contact-title"
        >
          <div className={styles.sectionShell}>
            <p className={styles.sectionLabel}>保持联系</p>
            <h2 id="contact-title">
              <span className={styles.unbrokenTerm}>把复杂的事，</span>
              <span className={styles.unbrokenTerm}>一起做清楚</span>
            </h2>
            <p className={styles.cooperationCopy}>
              <CopyLines
                lines={homepageDemo.cooperation.split(/(?<=需求，)/u)}
              />
            </p>
            <a
              className={styles.emailLink}
              href={`mailto:${homepageDemo.email}`}
            >
              <Mail size={19} strokeWidth={1.8} aria-hidden="true" />
              {homepageDemo.email}
              <ArrowUpRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </a>
            <a className={styles.phoneLink} href={`tel:${homepageDemo.phone}`}>
              <Phone size={15} strokeWidth={1.8} aria-hidden="true" />
              {homepageDemo.phone}
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.navShell}>
          <span>© 2026 {homepageDemo.name}</span>
          <a href="#content">返回顶部</a>
        </div>
      </footer>
      <BackToTop />
    </div>
  );
}
