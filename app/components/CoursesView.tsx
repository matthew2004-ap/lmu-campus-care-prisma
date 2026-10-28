'use client';

import { FormEvent, useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';

type Course = {
  id: string;
  title: string;
  course_code: string;
  department: string;
  level: string;
  description: string;
  active: boolean;
  created_at: string;
};

type Props = {
  rows: Course[];
  canManage: boolean;
  busy: boolean;
  act: (
    action: string,
    payload: Record<string, unknown>
  ) => Promise<boolean>;
  search: string;
  setSearch: (value: string) => void;
};

const emptyForm = {
  title: '',
  courseCode: '',
  department: '',
  level: '200L',
  description: '',
};

export default function CoursesView({
  rows,
  canManage,
  busy,
  act,
  search,
  setSearch,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);

  const visible = useMemo(() => {
    const query = search.toLowerCase().trim();

    return rows.filter((course) =>
      [
        course.title,
        course.course_code,
        course.department,
        course.level,
        course.description,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [rows, search]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const success = await act(
      editing ? 'course.update' : 'course.create',
      {
        ...form,
        ...(editing ? { id: editing } : {}),
      }
    );

    if (success) {
      setForm(emptyForm);
      setEditing(null);
    }
  }

  function startEdit(course: Course) {
    setEditing(course.id);

    setForm({
      title: course.title,
      courseCode: course.course_code,
      department: course.department,
      level: course.level,
      description: course.description,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="stack-lg">
      <section className="panel courses-intro">
        <div className="courses-intro-icon">
          <BookOpen size={25} />
        </div>

        <div>
          <span className="section-kicker">
            LANDMARK UNIVERSITY / ACADEMIC UPDATES
          </span>

          <h3>Newly Added Courses</h3>

          <p>
            View verified course announcements, course codes,
            departments, levels, and descriptions.
          </p>
        </div>
      </section>

      {canManage && (
        <section className="panel">
          <div className="panel-title-row">
            <div>
              <span className="section-kicker">VCM MANAGEMENT</span>
              <h3>
                {editing
                  ? 'Edit course announcement'
                  : 'Publish a course announcement'}
              </h3>
            </div>
          </div>

          <form className="form-grid" onSubmit={submit}>
            <label className="form-field">
              <span>Course title</span>
              <input
                required
                minLength={3}
                maxLength={180}
                value={form.title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    title: event.target.value,
                  })
                }
              />
            </label>

            <label className="form-field">
              <span>Course code</span>
              <input
                required
                maxLength={40}
                value={form.courseCode}
                onChange={(event) =>
                  setForm({
                    ...form,
                    courseCode: event.target.value.toUpperCase(),
                  })
                }
                placeholder="e.g. CSC 201"
              />
            </label>

            <label className="form-field">
              <span>Department</span>
              <input
                required
                maxLength={160}
                value={form.department}
                onChange={(event) =>
                  setForm({
                    ...form,
                    department: event.target.value,
                  })
                }
              />
            </label>

            <label className="form-field">
              <span>Level</span>
              <select
                value={form.level}
                onChange={(event) =>
                  setForm({
                    ...form,
                    level: event.target.value,
                  })
                }
              >
                {[
                  '100L',
                  '200L',
                  '300L',
                  '400L',
                  '500L',
                  '600L',
                  'All levels',
                ].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field wide">
              <span>Course description</span>
              <textarea
                required
                minLength={10}
                maxLength={3000}
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
              />
            </label>

            <div className="form-bottom wide">
              <button
                type="button"
                className="button button-light"
                onClick={() => {
                  setForm(emptyForm);
                  setEditing(null);
                }}
              >
                Clear
              </button>

              <button
                type="submit"
                className="button button-dark"
                disabled={busy}
              >
                {busy
                  ? 'Saving…'
                  : editing
                    ? 'Save changes'
                    : 'Publish course'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <span className="section-kicker">COURSE DIRECTORY</span>
            <h3>Course announcements</h3>
            <p>
              {visible.length}{' '}
              {visible.length === 1
                ? 'announcement'
                : 'announcements'}{' '}
              available
            </p>
          </div>

          <label className="search-box">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses…"
              aria-label="Search courses"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">
            <div>
              <BookOpen size={23} />
            </div>

            <b>
              {search
                ? 'No matching courses'
                : 'No course announcements yet'}
            </b>

            <p>
              {search
                ? 'Try another title, code, department, or level.'
                : 'Verified course announcements will appear here.'}
            </p>
          </div>
        ) : (
          <div className="course-grid">
            {visible.map((course) => (
              <article className="course-card" key={course.id}>
                <div className="course-card-top">
                  <span className="course-code">
                    {course.course_code}
                  </span>

                  <span className="course-level">
                    {course.level}
                  </span>
                </div>

                <h4>{course.title}</h4>

                <p className="course-department">
                  {course.department}
                </p>

                <p className="course-description">
                  {course.description}
                </p>

                <div className="course-card-footer">
                  <span>
                    Added{' '}
                    {new Date(
                      course.created_at
                    ).toLocaleDateString()}
                  </span>

                  {canManage && (
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="button button-light button-small"
                        onClick={() => startEdit(course)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="button button-light button-small"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Archive ${course.course_code}?`
                            )
                          ) {
                            await act('course.delete', {
                              id: course.id,
                            });
                          }
                        }}
                      >
                        Archive
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}