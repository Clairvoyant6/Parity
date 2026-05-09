from jinja2 import Template
from datetime import datetime
from io import BytesIO


def _extract_group_rows(group_data: dict) -> list:
    """Normalize current and legacy group metric schemas into table rows."""
    if not isinstance(group_data, dict):
        return []

    if "groups" in group_data and isinstance(group_data["groups"], dict):
        source = group_data["groups"]
    else:
        source = group_data

    rows = []
    for group_name, stats in source.items():
        if not isinstance(stats, dict):
            continue
        rows.append({
            "group_name": group_name,
            "positive_rate": stats.get("positive_rate", stats.get("prediction_rate", "N/A")),
            "true_positive_rate": stats.get("true_positive_rate", "N/A"),
            "false_positive_rate": stats.get("false_positive_rate", "N/A"),
            "count": stats.get("count", "N/A"),
        })
    return rows


def _fmt_number(value, digits: int = 3) -> str:
    try:
        return f"{float(value):.{digits}f}"
    except (TypeError, ValueError):
        return "N/A"


def _fmt_percent(value) -> str:
    try:
        return f"{float(value) * 100:.1f}%"
    except (TypeError, ValueError):
        return "N/A"


def _generate_reportlab_pdf(metrics: dict, filename: str, sensitive_cols: list, domain: str, risk_color: str) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=28, leftMargin=28, topMargin=28, bottomMargin=28)
    styles = getSampleStyleSheet()
    title = ParagraphStyle("ParityTitle", parent=styles["Title"], fontSize=28, leading=32, textColor=colors.white, spaceAfter=10)
    h2 = ParagraphStyle("ParityH2", parent=styles["Heading2"], fontSize=15, leading=19, textColor=colors.HexColor("#111827"), spaceBefore=18, spaceAfter=8)
    body = ParagraphStyle("ParityBody", parent=styles["BodyText"], fontSize=9.5, leading=14, textColor=colors.HexColor("#374151"))
    small = ParagraphStyle("ParitySmall", parent=styles["BodyText"], fontSize=8, leading=11, textColor=colors.HexColor("#6B7280"))

    story = []
    cover = Table(
        [[
            Paragraph("PARITY AI FAIRNESS INFRASTRUCTURE", ParagraphStyle("Brand", parent=small, textColor=colors.HexColor("#93C5FD"), fontSize=8, leading=10)),
            Paragraph(datetime.now().strftime("%d %b %Y, %H:%M"), ParagraphStyle("Date", parent=small, alignment=2, textColor=colors.HexColor("#CBD5E1"))),
        ], [
            Paragraph("Bias Audit Report", title),
            "",
        ], [
            Paragraph(f"Dataset: <b>{filename}</b><br/>Domain: <b>{domain}</b><br/>Sensitive attributes: <b>{', '.join(sensitive_cols)}</b>", ParagraphStyle("CoverMeta", parent=body, textColor=colors.HexColor("#DBEAFE"))),
            "",
        ]],
        colWidths=[4.7 * inch, 2.1 * inch],
    )
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#1E3A8A")),
        ("PADDING", (0, 0), (-1, -1), 16),
        ("SPAN", (0, 1), (-1, 1)),
    ]))
    story.extend([cover, Spacer(1, 18)])

    story.append(Paragraph("Executive Summary", h2))
    summary = Table([
        ["Bias Risk Score", "Risk Level", "Proxy Flags", "Disparate Impact"],
        [
            str(metrics.get("bias_risk_score", "N/A")),
            str(metrics.get("risk_level", "N/A")),
            str(len(metrics.get("proxy_flags", []))),
            _fmt_number(metrics.get("disparate_impact_ratio", metrics.get("disparate_impact_avg"))),
        ],
        ["Demographic Parity", "Model Accuracy", "Domain", "Sensitive Attributes"],
        [
            _fmt_number(metrics.get("demographic_parity_difference", metrics.get("demographic_parity_avg"))),
            _fmt_percent(metrics.get("model_accuracy")),
            domain,
            ", ".join(sensitive_cols),
        ],
    ], colWidths=[1.7 * inch] * 4)
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E5E7EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#6B7280")),
        ("TEXTCOLOR", (0, 2), (-1, 2), colors.HexColor("#6B7280")),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([summary, Spacer(1, 12), Paragraph(f"<b>AI finding:</b> {metrics.get('explanation', 'N/A')}", body)])

    story.append(Paragraph("Fairness Metrics by Group", h2))
    for col, data in metrics.get("group_metrics", {}).items():
        rows = _extract_group_rows(data)
        if not rows:
            continue
        story.append(Paragraph(str(col), ParagraphStyle("GroupTitle", parent=body, fontName="Helvetica-Bold", textColor=colors.HexColor("#111827"))))
        table_data = [["Group", "Positive Rate", "TPR", "FPR", "Count"]]
        for row in rows:
            table_data.append([str(row["group_name"]), str(row["positive_rate"]), str(row["true_positive_rate"]), str(row["false_positive_rate"]), str(row["count"])])
        table = Table(table_data, colWidths=[1.55 * inch, 1.3 * inch, 1.15 * inch, 1.15 * inch, 1 * inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E5E7EB")),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.extend([table, Spacer(1, 8)])

    proxy_flags = metrics.get("proxy_flags", [])
    if proxy_flags:
        story.append(Paragraph("Proxy Risk Register", h2))
        for flag in proxy_flags:
            story.append(Paragraph(
                f"<b>{flag.get('feature', 'Unknown')}</b> may proxy <b>{flag.get('sensitive_attribute', 'sensitive attribute')}</b>"
                f"{' (r=' + _fmt_number(flag.get('correlation')) + ')' if flag.get('correlation') is not None else ''}.",
                body,
            ))

    story.append(Paragraph("Recommended Actions", h2))
    story.append(Paragraph(
        "1. Apply sample reweighing across under-served groups.<br/>"
        "2. Run threshold optimization and compare error-rate parity.<br/>"
        "3. Remove, transform, or document proxy features before approval.<br/>"
        "4. Re-run Parity after every material model or dataset update.",
        body,
    ))
    story.append(Spacer(1, 16))
    story.append(Paragraph("Generated by Parity | Detect bias. Explain decisions. Build fair AI.", small))
    doc.build(story)
    return buffer.getvalue()


def _pdf_escape(text: str) -> str:
    return str(text).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _generate_builtin_pdf(metrics: dict, filename: str, sensitive_cols: list, domain: str) -> bytes:
    """Dependency-free PDF fallback for local/dev environments."""
    lines = [
        ("PARITY AI FAIRNESS INFRASTRUCTURE", 9, "muted"),
        ("Bias Audit Report", 26, "title"),
        (f"Dataset: {filename}", 10, "normal"),
        (f"Domain: {domain}", 10, "normal"),
        (f"Sensitive attributes: {', '.join(sensitive_cols)}", 10, "normal"),
        (f"Generated: {datetime.now().strftime('%d %b %Y, %H:%M')}", 10, "normal"),
        ("", 10, "normal"),
        ("Executive Summary", 16, "heading"),
        (f"Bias risk score: {metrics.get('bias_risk_score', 'N/A')} / 100", 12, "bold"),
        (f"Risk level: {metrics.get('risk_level', 'N/A')}", 12, "bold"),
        (f"Disparate impact: {_fmt_number(metrics.get('disparate_impact_ratio', metrics.get('disparate_impact_avg')))}", 10, "normal"),
        (f"Demographic parity difference: {_fmt_number(metrics.get('demographic_parity_difference', metrics.get('demographic_parity_avg')))}", 10, "normal"),
        (f"Model accuracy: {_fmt_percent(metrics.get('model_accuracy'))}", 10, "normal"),
        (f"Proxy flags: {len(metrics.get('proxy_flags', []))}", 10, "normal"),
        ("", 10, "normal"),
        ("AI Finding", 16, "heading"),
        (metrics.get("explanation", "N/A"), 10, "normal"),
        ("", 10, "normal"),
        ("Fairness Metrics by Group", 16, "heading"),
    ]

    for col, data in metrics.get("group_metrics", {}).items():
        rows = _extract_group_rows(data)
        if not rows:
            continue
        lines.append((str(col), 12, "bold"))
        for row in rows[:12]:
            lines.append((
                f"- {row['group_name']}: positive={row['positive_rate']}, TPR={row['true_positive_rate']}, FPR={row['false_positive_rate']}, n={row['count']}",
                9,
                "normal",
            ))

    proxy_flags = metrics.get("proxy_flags", [])
    if proxy_flags:
        lines.extend([("", 10, "normal"), ("Proxy Risk Register", 16, "heading")])
        for flag in proxy_flags:
            corr = f" r={_fmt_number(flag.get('correlation'))}" if flag.get("correlation") is not None else ""
            lines.append((f"- {flag.get('feature', 'Unknown')} may proxy {flag.get('sensitive_attribute', 'sensitive attribute')}.{corr}", 10, "normal"))

    lines.extend([
        ("", 10, "normal"),
        ("Recommended Actions", 16, "heading"),
        ("1. Apply sample reweighing across under-served groups.", 10, "normal"),
        ("2. Run threshold optimization and compare error-rate parity.", 10, "normal"),
        ("3. Remove, transform, or document proxy features before approval.", 10, "normal"),
        ("4. Re-run Parity after every material model or dataset update.", 10, "normal"),
    ])

    pages: list[str] = []
    y = 785
    content = ["0.94 0.97 1 rg 0 0 595 842 re f", "0.06 0.09 0.16 rg 0 742 595 100 re f"]
    for text, size, style in lines:
      wrapped = []
      words = str(text).split()
      current = ""
      max_chars = 70 if size <= 10 else 44
      for word in words or [""]:
          if len(current) + len(word) + 1 > max_chars:
              wrapped.append(current)
              current = word
          else:
              current = f"{current} {word}".strip()
      if current or not wrapped:
          wrapped.append(current)
      for part in wrapped:
          if y < 52:
              pages.append("\n".join(content))
              y = 785
              content = ["0.94 0.97 1 rg 0 0 595 842 re f"]
          if style in {"title", "muted"}:
              color = "1 1 1 rg"
          elif style == "heading":
              color = "0.10 0.23 0.55 rg"
          else:
              color = "0.07 0.09 0.14 rg"
          font = "/F2" if style in {"title", "heading", "bold"} else "/F1"
          content.append(f"{color} BT {font} {size} Tf 48 {y} Td ({_pdf_escape(part)}) Tj ET")
          y -= max(size + 6, 15)
    pages.append("\n".join(content))

    all_objects = [
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]
    kids = []
    page_objects = []
    next_id = 5
    for page in pages:
        page_id = next_id
        stream_id = next_id + 1
        next_id += 2
        kids.append(f"{page_id} 0 R")
        encoded = page.encode("latin-1", errors="replace")
        page_objects.append((
            page_id,
            f"<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> /Contents {stream_id} 0 R >>",
        ))
        page_objects.append((stream_id, f"<< /Length {len(encoded)} >>\nstream\n{page}\nendstream"))
    all_objects.append(f"<< /Type /Pages /Kids [{' '.join(kids)}] /Count {len(kids)} >>")
    all_objects.append("<< /Type /Catalog /Pages 3 0 R >>")
    for _, obj in sorted(page_objects, key=lambda item: item[0]):
        all_objects.append(obj)

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(all_objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n{obj}\nendobj\n".encode("latin-1", errors="replace"))
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(all_objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(f"trailer\n<< /Size {len(all_objects) + 1} /Root 4 0 R >>\nstartxref\n{xref}\n%%EOF".encode("ascii"))
    return bytes(pdf)

def generate_pdf_report(metrics: dict, filename: str, sensitive_cols: list, domain: str) -> bytes:
    """Generates a polished HTML audit report and converts it to PDF."""
    
    html_template = """
    <html>
    <head>
        <style>
            @page { size: A4; margin: 28px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #111827; background: #ffffff; }
            h1, h2, h3 { margin: 0; }
            .cover { background: #0F172A; color: white; padding: 28px; border-radius: 16px; }
            .brand { font-size: 12px; letter-spacing: 1.8px; color: #93C5FD; text-transform: uppercase; }
            .title { font-size: 34px; line-height: 1.05; margin-top: 10px; font-weight: 800; }
            .subtitle { color: #CBD5E1; margin-top: 12px; font-size: 13px; line-height: 1.5; }
            .meta { width: 100%; margin-top: 22px; border-collapse: collapse; }
            .meta td { color: #DBEAFE; font-size: 11px; padding: 6px 0; border: 0; }
            .section { margin-top: 28px; }
            .section-title { font-size: 18px; color: #111827; padding-bottom: 8px; border-bottom: 2px solid #E5E7EB; }
            .summary-table { width: 100%; border-collapse: separate; border-spacing: 8px; margin-top: 14px; }
            .summary-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 14px; }
            .label { color: #6B7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; }
            .value { font-size: 24px; font-weight: 800; margin-top: 5px; }
            .risk-score { font-size: 52px; font-weight: 900; color: {{ risk_color }}; line-height: 0.95; }
            .callout { padding: 14px; border-radius: 12px; margin: 12px 0; font-size: 12px; line-height: 1.5; }
            .metric-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px; margin: 10px 0; font-size: 12px; line-height: 1.55; }
            .info { background: #EFF6FF; border-left: 4px solid #2563EB; color: #1E3A8A; }
            .warning { background: #FFFBEB; border-left: 4px solid #F59E0B; color: #92400E; }
            .critical { background: #FEF2F2; border-left: 4px solid #EF4444; color: #991B1B; }
            table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11px; }
            th { background: #111827; color: white; padding: 9px; text-align: left; }
            td { padding: 9px; border-bottom: 1px solid #E5E7EB; }
            tr:nth-child(even) td { background: #F9FAFB; }
            .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; }
            .pass { background: #ECFDF5; color: #047857; }
            .fail { background: #FEF2F2; color: #DC2626; }
            .muted { color: #6B7280; }
            .footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #6B7280; }
        </style>
    </head>
    <body>
        <div class="cover">
            <div class="brand">Parity AI Fairness Infrastructure</div>
            <div class="title">Bias Audit Report</div>
            <div class="subtitle">Explainable fairness evidence for model governance, compliance review, and mitigation planning.</div>
            <table class="meta">
                <tr><td><strong>Dataset</strong><br/>{{ filename }}</td><td><strong>Domain</strong><br/>{{ domain }}</td></tr>
                <tr><td><strong>Sensitive attributes</strong><br/>{{ sensitive_cols }}</td><td><strong>Generated</strong><br/>{{ date }}</td></tr>
            </table>
        </div>

        <div class="section">
          <h2 class="section-title">Executive Summary</h2>
          <table class="summary-table">
            <tr>
              <td class="summary-card"><div class="label">Bias risk score</div><div class="risk-score">{{ risk_score }}</div><div class="muted">out of 100</div></td>
              <td class="summary-card"><div class="label">Risk level</div><div class="value" style="color: {{ risk_color }}">{{ risk_level }}</div></td>
              <td class="summary-card"><div class="label">Proxy flags</div><div class="value">{{ proxy_count }}</div></td>
            </tr>
            <tr>
              <td class="summary-card"><div class="label">Disparate impact</div><div class="value">{{ disparate_impact }}</div></td>
              <td class="summary-card"><div class="label">Parity difference</div><div class="value">{{ demographic_parity }}</div></td>
              <td class="summary-card"><div class="label">Model accuracy</div><div class="value">{{ model_accuracy }}</div></td>
            </tr>
          </table>
          <div class="callout info"><strong>Finding:</strong> {{ explanation }}</div>
        </div>

        <div class="section">
        <h2 class="section-title">Fairness Metrics by Group</h2>
        {% for col, data in group_metrics.items() %}
        <h3>{{ col }}</h3>
        <table>
            <tr>
                <th>Group</th>
                <th>Positive Rate</th>
                <th>True Positive Rate</th>
                <th>False Positive Rate</th>
                <th>Count</th>
            </tr>
            {% for row in data.rows %}
            <tr>
                <td>{{ row.group_name }}</td>
                <td>{{ row.positive_rate }}</td>
                <td>{{ row.true_positive_rate }}</td>
                <td>{{ row.false_positive_rate }}</td>
                <td>{{ row.count }}</td>
            </tr>
            {% endfor %}
        </table>
        <div class="metric-card">
            <strong>Disparate Impact:</strong> {{ data.disparate_impact_ratio }}
            (threshold: 0.8 — below this is a legal red flag)<br/>
            <strong>Demographic Parity Difference:</strong> {{ data.demographic_parity_difference }}<br/>
            <strong>Equalized Odds:</strong> {{ data.equalized_odds }}<br/>
            <strong>Predictive Parity:</strong> {{ data.predictive_parity }}
        </div>
        {% endfor %}
        </div>

        {% if proxy_flags %}
        <div class="section">
        <h2 class="section-title">Proxy Risk Register</h2>
        {% for flag in proxy_flags %}
        <div class="warning"><strong>{{ flag.feature }}</strong> may proxy <strong>{{ flag.sensitive_attribute }}</strong>{% if flag.correlation %} (r={{ "%.3f"|format(flag.correlation) }}){% endif %}. {{ flag.warning }}</div>
        {% endfor %}
        </div>
        {% endif %}

        <div class="section">
        <h2 class="section-title">Regulatory Readiness</h2>
        {% if risk_score >= 65 %}
        <div class="critical"><strong>EU AI Act:</strong> This model may require mandatory bias testing before deployment in high-risk domains.</div>
        <div class="critical"><strong>NYC Local Law 144:</strong> If used for hiring in NYC, independent audit evidence is required.</div>
        {% else %}
        <div class="callout info">No immediate critical regulatory violation detected. Continue monitoring and rerun this audit after model updates.</div>
        {% endif %}
        </div>

        <div class="section">
        <h2 class="section-title">Recommended Actions</h2>
        <div class="callout info">
            1. <strong>Reweighing:</strong> Adjust training sample weights to balance group representation.<br/>
            2. <strong>Threshold Optimization:</strong> Apply different decision thresholds per demographic group.<br/>
            3. <strong>Proxy Removal:</strong> Remove or transform features that correlate with sensitive attributes.<br/>
            4. <strong>Regular Auditing:</strong> Re-run Parity after every model retrain.
        </div>
        </div>

        <div class="footer">
            Generated by Parity | Detect bias. Explain decisions. Build fair AI. | {{ date }}
        </div>
    </body>
    </html>
    """

    risk_color = "#dc3545" if metrics["bias_risk_score"] >= 65 else \
                 "#ffc107" if metrics["bias_risk_score"] >= 35 else "#28a745"

    try:
        return _generate_reportlab_pdf(metrics, filename, sensitive_cols, domain, risk_color)
    except Exception:
        import traceback
        traceback.print_exc()
        try:
            return _generate_builtin_pdf(metrics, filename, sensitive_cols, domain)
        except Exception:
            traceback.print_exc()

    template = Template(html_template)
    html = template.render(
        filename=filename,
        domain=domain,
        sensitive_cols=", ".join(sensitive_cols),
        date=datetime.now().strftime("%d %B %Y, %H:%M"),
        risk_score=metrics["bias_risk_score"],
        risk_level=metrics["risk_level"],
        risk_color=risk_color,
        proxy_count=len(metrics.get("proxy_flags", [])),
        disparate_impact=_fmt_number(metrics.get("disparate_impact_ratio", metrics.get("disparate_impact_avg"))),
        demographic_parity=_fmt_number(metrics.get("demographic_parity_difference", metrics.get("demographic_parity_avg"))),
        model_accuracy=_fmt_percent(metrics.get("model_accuracy")),
        explanation=metrics.get("explanation", "N/A"),
        group_metrics={
            col: {**data, "rows": _extract_group_rows(data)}
            for col, data in metrics.get("group_metrics", {}).items()
            if isinstance(data, dict)
        },
        proxy_flags=[
            {
                **flag,
                "warning": flag.get(
                    "warning",
                    f"{flag.get('feature', 'Unknown feature')} correlates with {flag.get('sensitive_attribute', 'a sensitive attribute')}"
                )
            }
            for flag in metrics.get("proxy_flags", [])
            if isinstance(flag, dict)
        ],
    )

    try:
        from xhtml2pdf import pisa
        from io import BytesIO
        result = BytesIO()
        pdf = pisa.CreatePDF(BytesIO(html.encode("utf-8")), dest=result)
        if not pdf.err:
            return result.getvalue()
        else:
            return html.encode("utf-8")
    except Exception as e:
        import traceback
        traceback.print_exc()
        return html.encode("utf-8")
