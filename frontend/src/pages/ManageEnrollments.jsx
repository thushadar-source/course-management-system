
import { useEffect, useState } from "react";
import { FaTrash, FaCheck, FaTimes } from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const INITIAL_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
};

function ManageEnrollments() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const [enrollments, setEnrollments] = useState([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const selectedCourse =
    courses.find((course) => String(course.id) === selectedCourseId) || null;

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        const response = await api.get("/courses");

        if (!cancelled) {
          setCourses(response.data.courses || []);
        }
      } catch (err) {
        console.error("Could not load courses:", err.message);
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEnrollments = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          page,
          limit,
          sort,
          order
        };

        if (search.trim()) params.q = search.trim();
        if (selectedCourseId) params.courseId = selectedCourseId;
        if (from) params.from = from;
        if (to) params.to = to;
        if (status) params.status = status;

        const response = await api.get("/enrollments", { params });

        if (cancelled) return;

        const records = response.data.enrollments || [];
        const meta = response.data.pagination || INITIAL_PAGINATION;

        setEnrollments(records);
        setPagination(meta);

        if (records.length === 0 && meta.total > 0 && page > 1) {
          setPage((current) => current - 1);
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err.response?.data?.message || "Failed to load enrollments."
        );

        setEnrollments([]);
        setPagination({
          page,
          limit,
          total: 0,
          totalPages: 0
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEnrollments();

    return () => {
      cancelled = true;
    };
  }, [
    page,
    limit,
    sort,
    order,
    search,
    selectedCourseId,
    from,
    to,
    status,
    reloadKey
  ]);

  const resetPage = (setter, value) => {
    setter(value);
    setPage(1);
    setSuccess("");
    setError("");
  };

  const handleApprove = async (enrollment) => {
    const confirmed = window.confirm(
      `Approve ${enrollment.full_name || enrollment.username}'s enrollment in "${enrollment.title}"?`
    );

    if (!confirmed) return;

    setProcessingId(enrollment.id);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(
        `/enrollments/${enrollment.id}/approve`
      );

      setSuccess(response.data.message || "Enrollment approved successfully.");
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not approve enrollment."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (enrollment) => {
    if (rejectingId !== enrollment.id) {
      setRejectingId(enrollment.id);
      setRejectionReason("");
      setError("");
      setSuccess("");
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      setError("Please enter a reason for rejecting this enrollment.");
      return;
    }

    setProcessingId(enrollment.id);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(
        `/enrollments/${enrollment.id}/reject`,
        { reason }
      );

      setSuccess(response.data.message || "Enrollment rejected successfully.");
      setRejectingId(null);
      setRejectionReason("");
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not reject enrollment."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (enrollment) => {
    const name =
      enrollment.full_name || enrollment.username || "this student";

    const confirmed = window.confirm(
      `Remove ${name}'s ${enrollment.status || ""} enrollment in "${enrollment.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/enrollments/${enrollment.id}`);

      setSuccess(response.data.message || "Enrollment removed successfully.");
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not delete the enrollment."
      );
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleDateString();
  };

  const getStatusClass = (value) => {
    switch (value) {
      case "pending":
        return "tag tag-pending";
      case "approved":
        return "tag tag-approved";
      case "rejected":
        return "tag tag-rejected";
      default:
        return "tag";
    }
  };

  const startRecord =
    pagination.total === 0 ? 0 : (page - 1) * limit + 1;

  const endRecord = Math.min(page * limit, pagination.total);
  const totalPages = pagination.totalPages;

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="page-header">
          <div>
            <h1>Manage Enrollments</h1>
            <p className="page-subtitle">
              Review student enrollment requests and manage approvals.
            </p>
          </div>
        </div>

        <section className="section-card">
          <div className="filter-bar">

            <div className="form-group">
              <label htmlFor="enrollmentSearch">
                Search student name or username
              </label>
              <input
                id="enrollmentSearch"
                className="input"
                type="search"
                value={search}
                placeholder="Enter a name or username"
                onChange={(event) =>
                  resetPage(setSearch, event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="courseFilter">Course</label>
              <select
                id="courseFilter"
                className="input"
                value={selectedCourseId}
                onChange={(event) =>
                  resetPage(setSelectedCourseId, event.target.value)
                }
              >
                <option value="">All courses</option>

                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="statusFilter">Enrollment Status</label>
              <select
                id="statusFilter"
                className="input"
                value={status}
                onChange={(event) =>
                  resetPage(setStatus, event.target.value)
                }
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dateFrom">Enrolled from</label>
              <input
                id="dateFrom"
                className="input"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) =>
                  resetPage(setFrom, event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateTo">Enrolled to</label>
              <input
                id="dateTo"
                className="input"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) =>
                  resetPage(setTo, event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="sortBy">Sort by</label>
              <select
                id="sortBy"
                className="input"
                value={sort}
                onChange={(event) =>
                  resetPage(setSort, event.target.value)
                }
              >
                <option value="date">Enrollment date</option>
                <option value="student">Student name</option>
                <option value="course">Course name</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sortOrder">Sort order</label>
              <select
                id="sortOrder"
                className="input"
                value={order}
                onChange={(event) =>
                  resetPage(setOrder, event.target.value)
                }
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="pageSize">Records per page</label>
              <select
                id="pageSize"
                className="input"
                value={limit}
                onChange={(event) =>
                  resetPage(setLimit, Number(event.target.value))
                }
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="form-group">
              <label> </label>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSearch("");
                  setSelectedCourseId("");
                  setFrom("");
                  setTo("");
                  setSort("date");
                  setOrder("desc");
                  setLimit(20);
                  setStatus("");
                  setPage(1);
                  setSuccess("");
                  setError("");
                }}
              >
                Clear filters
              </button>
            </div>
          </div>
        </section>

        {success && <p className="success">{success}</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <section className="section-card">
          <div className="section-card-header">
            <h2>
              {selectedCourse
                ? `Enrollments: ${selectedCourse.title}`
                : "All Enrollments"}
            </h2>

            <p>
              Showing {startRecord}–{endRecord} of {pagination.total}
            </p>
          </div>

          {loading && (
            <p className="loading">Loading enrollments...</p>
          )}

          {!loading && enrollments.length === 0 && (
            <p className="empty">
              No enrollments match your search or filters.
            </p>
          )}

          {!loading && enrollments.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Username</th>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Enrolled On</th>
                    <th>Status</th>
                    <th>Decision Note</th>
                    <th className="table-actions-column">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.full_name || "-"}</td>
                      <td>{enrollment.username || "-"}</td>
                      <td>{enrollment.title || "-"}</td>
                      <td>{enrollment.category || "-"}</td>

                      <td>
                        <span className="tag tag-level">
                          {enrollment.level || "-"}
                        </span>
                      </td>

                      <td>{formatDate(enrollment.enrolled_at)}</td>

                      <td>
                        <span className={getStatusClass(enrollment.status)}>
                          {(enrollment.status || "unknown").toUpperCase()}
                        </span>
                      </td>

                      <td>{enrollment.decision_note || "-"}</td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                            minWidth: "150px"
                          }}
                        >
                          {enrollment.status === "pending" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-small"
                                disabled={processingId === enrollment.id}
                                onClick={() => handleApprove(enrollment)}
                              >
                                <FaCheck /> Approve
                              </button>

                              <button
                                type="button"
                                className="btn btn-small btn-danger"
                                disabled={processingId === enrollment.id}
                                onClick={() => handleReject(enrollment)}
                              >
                                <FaTimes /> Reject
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            disabled={processingId === enrollment.id}
                            onClick={() => handleDelete(enrollment)}
                          >
                            <FaTrash /> Remove
                          </button>
                        </div>

                        {rejectingId === enrollment.id && (
                          <div style={{ marginTop: "10px", minWidth: "180px" }}>
                            <textarea
                              className="input"
                              rows="3"
                              value={rejectionReason}
                              placeholder="Enter rejection reason..."
                              onChange={(event) =>
                                setRejectionReason(event.target.value)
                              }
                            />

                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                marginTop: "6px"
                              }}
                            >
                              <button
                                type="button"
                                className="btn btn-small btn-danger"
                                disabled={processingId === enrollment.id}
                                onClick={() => handleReject(enrollment)}
                              >
                                Confirm Reject
                              </button>

                              <button
                                type="button"
                                className="btn btn-small"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectionReason("");
                                  setError("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div
            className="filter-bar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              padding: "16px 0"
            }}
          >
            <p>
              Page {page} of {totalPages} · {pagination.total} total records
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                disabled={loading || page <= 1}
                onClick={() => setPage(1)}
              >
                First
              </button>

              <button
                type="button"
                className="btn"
                disabled={loading || page <= 1}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
              >
                Previous
              </button>

              <button
                type="button"
                className="btn"
                disabled={
                  loading || page >= totalPages || totalPages === 0
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(totalPages, current + 1)
                  )
                }
              >
                Next
              </button>

              <button
                type="button"
                className="btn"
                disabled={
                  loading || page >= totalPages || totalPages === 0
                }
                onClick={() => setPage(totalPages)}
              >
                Last
              </button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

export default ManageEnrollments;
