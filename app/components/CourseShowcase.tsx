'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, Sparkles } from 'lucide-react';

const courses = [
  { title: 'Software Engineering', field: 'Computing & Technology' },
  { title: 'Cyber Security', field: 'Computing & Technology' },
  { title: 'Artificial Intelligence', field: 'Computing & Technology' },
  { title: 'Telecommunication Science', field: 'Computing & Technology' },
  { title: 'Nursing Science (B.N.Sc.)', field: 'Health Sciences' },
  { title: 'Public Health', field: 'Health Sciences' },
  { title: 'Criminology and Security Studies', field: 'Social Sciences' },
];

const rotationDuration = 6200;

export default function CourseShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const activeCourse = courses[activeIndex];

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setMotionAllowed(!motionPreference.matches);

    updateMotionPreference();
    motionPreference.addEventListener('change', updateMotionPreference);
    return () => motionPreference.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (isPaused || !motionAllowed) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % courses.length);
    }, rotationDuration);

    return () => window.clearInterval(timer);
  }, [activeIndex, isPaused, motionAllowed]);

  function showCourse(index: number) {
    setActiveIndex((index + courses.length) % courses.length);
  }

  return (
    <section className="course-section" id="courses" aria-labelledby="course-section-title">
      <div className="wrap">
        <div className="course-intro">
          <div>
            <span className="section-kicker">A NEW CHAPTER AT LMU</span>
            <h2 id="course-section-title">
              New courses.
              <br />
              <em>New possibilities.</em>
            </h2>
          </div>
          <p>
            Discover the new programmes Landmark University is bringing to its
            academic community.
          </p>
        </div>

        <div
          className="course-stage"
          role="region"
          aria-roledescription="carousel"
          aria-label="New courses at Landmark University"
        >
          <video
            className="course-stage-video"
            src="/assets/campus.mp4"
            autoPlay={motionAllowed}
            loop
            muted
            playsInline
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="course-stage-grain" />
          <div className="course-stage-inner">
            <div className="course-main">
              <div className="course-stage-kicker">
                <Sparkles size={14} />
                <span>INTRODUCING NEW PROGRAMMES</span>
              </div>

              <div className="course-copy" key={activeIndex} aria-live="polite" aria-atomic="true">
                <span className="course-field">{activeCourse.field}</span>
                <span className="course-number">
                  PROGRAMME {String(activeIndex + 1).padStart(2, '0')}
                </span>
                <h3>{activeCourse.title}</h3>
                <p>
                  A new academic pathway at Landmark University. Explore this
                  programme through the official university portal.
                </p>
                <a
                  className="course-portal-link"
                  href="https://portal.lmu.edu.ng/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Explore the university portal <ArrowUpRight size={16} />
                </a>
              </div>

              <div className="course-controls">
                <div className="course-progress" aria-hidden="true">
                  {courses.map((course, index) => (
                    <span className="course-progress-track" key={course.title}>
                      {index === activeIndex && (
                        <span
                          className="course-progress-fill"
                          style={{
                            animationDuration: `${rotationDuration}ms`,
                            animationPlayState: isPaused ? 'paused' : 'running',
                          }}
                        />
                      )}
                    </span>
                  ))}
                </div>
                <div className="course-control-row">
                  <span className="course-counter">
                    <b>{String(activeIndex + 1).padStart(2, '0')}</b>
                    <i />
                    {String(courses.length).padStart(2, '0')}
                  </span>
                  <div className="course-control-buttons">
                    <button
                      type="button"
                      className="course-control-button"
                      aria-label={isPaused ? 'Resume course slideshow' : 'Pause course slideshow'}
                      aria-pressed={isPaused}
                      onClick={() => setIsPaused((paused) => !paused)}
                    >
                      {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <button
                      type="button"
                      className="course-control-button"
                      aria-label="Previous course"
                      onClick={() => showCourse(activeIndex - 1)}
                    >
                      <ArrowLeft size={17} />
                    </button>
                    <button
                      type="button"
                      className="course-control-button course-control-next"
                      aria-label="Next course"
                      onClick={() => showCourse(activeIndex + 1)}
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <nav className="course-chapters" aria-label="Choose a course">
              <span className="course-chapters-title">THE LINE-UP</span>
              {courses.map((course, index) => (
                <button
                  type="button"
                  className={`course-chapter${index === activeIndex ? ' is-active' : ''}`}
                  key={course.title}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  aria-label={`Show course ${index + 1}: ${course.title}`}
                  onClick={() => showCourse(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <b>{course.title}</b>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </nav>
          </div>
          <span className="course-stage-caption">LANDMARK UNIVERSITY <i /> OMU-ARAN, NIGERIA</span>
        </div>
      </div>
    </section>
  );
}
