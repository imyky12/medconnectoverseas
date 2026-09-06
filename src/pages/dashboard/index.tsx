import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Clock, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * The first screen after signing in. It should feel like your own shelf of
 * courses — a picture, a name, and a way straight back in.
 */

export default function MyLearning() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    api
      .get<any>('/courses/my-courses', { headers: { Authorization: `Bearer ${token}` } })
      // A course deleted after purchase comes back as null — never let one bad
      // entry take down the whole page.
      .then((res: any) => { if (res.success) setCourses((res.data ?? []).filter(Boolean)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display text-[32px] font-600 leading-tight text-ink">
          {user?.firstName ? `Hello, ${user.firstName}` : 'Your courses'}
        </h1>
        <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-muted">
          {courses.length === 0
            ? 'Your courses will show up here once you have joined one.'
            : `You have ${courses.length === 1 ? 'one course' : `${courses.length} courses`}. They stay yours — there is no time limit.`}
        </p>
      </header>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-rule bg-surface px-6 py-16 text-center">
          <p className="text-[17px] font-600 text-ink">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[15px] leading-relaxed text-muted">
            Pick a course, pay by UPI, and we will open it for you once we have checked the payment
            — usually within a couple of hours.
          </p>
          <button
            onClick={() => navigate('/dashboard/marketplace')}
            className="mt-5 rounded-lg bg-signal px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-signal-deep"
          >
            See what&rsquo;s available
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <button
              key={c._id}
              onClick={() => navigate(`/dashboard/course/${c.courseCode}`)}
              className="group overflow-hidden rounded-xl border border-rule bg-surface text-left transition-shadow hover:shadow-[0_2px_16px_rgba(7,26,51,0.08)]"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-paper">
                {c.thumbnail && (
                  <img
                    src={c.thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                )}
              </div>

              <div className="p-5">
                <h2 className="text-[16px] font-600 leading-snug text-ink group-hover:text-signal">{c.title}</h2>
                {c.instructorName && (
                  <p className="mt-1 text-[14px] text-muted">with {c.instructorName}</p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[13px] text-faint">
                    {c.estimatedDurationHours ? (
                      <><Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> {c.estimatedDurationHours} hours</>
                    ) : (
                      <span className="capitalize">{c.difficulty ?? ''}</span>
                    )}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[14px] font-medium text-signal">
                    Open <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {courses.length > 0 && (
        <button
          onClick={() => navigate('/dashboard/marketplace')}
          className="text-[15px] font-medium text-signal hover:text-signal-deep"
        >
          Find another course
        </button>
      )}
    </div>
  );
}
