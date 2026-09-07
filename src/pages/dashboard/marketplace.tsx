import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Clock, Users } from 'lucide-react';
import { api } from '../../services/api';

/**
 * A catalogue is browsed and compared, so unlike events this earns a grid.
 * Two columns rather than three, so each entry has room to say what it is —
 * price, level, length and who teaches it — instead of being a thumbnail with
 * a title under it.
 *
 * Categories are read from the courses that exist rather than hard-coded, so
 * the filter can never offer an empty category.
 */

export default function Marketplace() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<any>('/courses/marketplace')
      .then((res: any) => { if (res.success) setCourses(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set(courses.map((c) => c.category).filter(Boolean));
    return ['All', ...[...set].sort()];
  }, [courses]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => category === 'All' || c.category?.toLowerCase() === category.toLowerCase())
      .filter((c) => !q || [c.title, c.instructorName, c.courseCode, c.category]
        .filter(Boolean).some((v: string) => v.toLowerCase().includes(q)));
  }, [courses, query, category]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[32px] font-600 leading-tight text-ink">Courses</h1>
        <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-muted">
          Recorded courses that stay yours for good. Pay by UPI and we open the course for you once
          we have checked the payment — usually within a couple of hours.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses"
            className="w-full rounded-md border border-rule bg-surface py-2.5 pl-9 pr-3 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
          />
        </div>
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={[
                  'rounded-md px-3 py-1.5 text-[13px] transition-colors',
                  category === c ? 'bg-ink font-medium text-white' : 'text-muted hover:bg-rule-soft hover:text-ink',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="panel px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-ink">
            {courses.length === 0 ? 'No courses are published yet' : 'Nothing matches that'}
          </p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] text-muted">
            {courses.length === 0
              ? 'New courses are added regularly. Check back soon.'
              : 'Try a different search or category.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((c) => {
            const price = c.discountedPrice ?? c.price;
            const discounted = c.discountedPrice != null && c.discountedPrice < c.price;
            return (
              <button
                key={c._id}
                onClick={() => navigate(`/dashboard/course/${c.courseCode}`)}
                className="panel group flex gap-4 p-4 text-left transition-colors hover:border-signal"
              >
                <div className="hidden h-[92px] w-[124px] shrink-0 overflow-hidden rounded bg-paper sm:block">
                  {c.thumbnail && (
                    <img
                      src={c.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-[16px] font-600 leading-snug text-ink group-hover:text-signal">{c.title}</p>
                  {c.instructorName && (
                    <p className="mt-1 truncate text-[14px] text-muted">with {c.instructorName}</p>
                  )}

                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-faint">
                    {c.estimatedDurationHours ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> {c.estimatedDurationHours}h
                      </span>
                    ) : null}
                    {c.totalEnrollments ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" strokeWidth={1.75} /> {c.totalEnrollments} enrolled
                      </span>
                    ) : null}
                    {c.difficulty ? <span className="capitalize">{c.difficulty}</span> : null}
                  </p>

                  <div className="mt-auto flex items-baseline gap-2 pt-3">
                    <span className="tabular text-[20px] font-700 text-ink">
                      {price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                    </span>
                    {discounted && (
                      <span className="tabular text-[13px] text-faint line-through">
                        ₹{c.price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
