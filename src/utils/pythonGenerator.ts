import { AppConfig } from '../types';

export function generatePythonScript(config: AppConfig): string {
  const p0 = config.controlPoints[0] || { x: 0.1, y: 0.8 };
  const p1 = config.controlPoints[1] || { x: 0.3, y: 0.2 };
  const p2 = config.controlPoints[2] || { x: 0.7, y: 0.9 };
  const p3 = config.controlPoints[3] || { x: 0.9, y: 0.1 };

  return `"""
=============================================================================
  Bayer Attractor Grid & 45° Parallelogram Shadow Projection Generator
=============================================================================
  Created for PyCharm & Python 3.8+
  Dependencies: tkinter (built-in), Pillow (pip install pillow numpy)
  
  Features:
  1) Square grid up to 100x100 squares
  2) Grasshopper-style Attractor Curve with interactive control points
  3) Bayer Ordered Dithering (2x2, 4x4, 8x8) across 4 blue shades
  4) 45-degree Parallelogram Shadow Projection for the lightest background color
=============================================================================
"""

import math
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
try:
    from PIL import Image, ImageTk, ImageDraw
except ImportError:
    messagebox.showerror(
        "Missing Pillow Library", 
        "Please run 'pip install pillow numpy' in your PyCharm terminal!"
    )
    raise

# ---------------------------------------------------------------------------
# Bayer Matrices
# ---------------------------------------------------------------------------
BAYER_2x2 = [
    [0/4, 2/4],
    [3/4, 1/4]
]

def generate_bayer_matrix(size):
    if size == 2:
        return BAYER_2x2
    prev_size = size // 2
    prev = generate_bayer_matrix(prev_size)
    matrix = [[0.0]*size for _ in range(size)]
    for r in range(prev_size):
        for c in range(prev_size):
            val = prev[r][c] * (prev_size * prev_size)
            matrix[r][c] = (4 * val) / (size * size)
            matrix[r][c + prev_size] = (4 * val + 2) / (size * size)
            matrix[r + prev_size][c] = (4 * val + 3) / (size * size)
            matrix[r + prev_size][c + prev_size] = (4 * val + 1) / (size * size)
    return matrix

# ---------------------------------------------------------------------------
# Hex to RGB Helper
# ---------------------------------------------------------------------------
def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

# ---------------------------------------------------------------------------
# Polygon Clipping Helper (Sutherland-Hodgman)
# ---------------------------------------------------------------------------
def clip_polygon_to_box(pts, min_x, min_y, max_x, max_y):
    if not pts:
        return []
    def clip_edge(points, inside, intersect):
        if not points:
            return []
        res = []
        s = points[-1]
        for e in points:
            if inside(e):
                if inside(s):
                    res.append(e)
                else:
                    res.append(intersect(s, e))
                    res.append(e)
            elif inside(s):
                res.append(intersect(s, e))
            s = e
        return res

    eps = 1e-6
    output = pts
    output = clip_edge(output, lambda p: p[0] >= min_x - eps, lambda p1, p2: (min_x, p1[1] + (p2[1] - p1[1]) * (min_x - p1[0]) / (p2[0] - p1[0] or eps)))
    output = clip_edge(output, lambda p: p[0] <= max_x + eps, lambda p1, p2: (max_x, p1[1] + (p2[1] - p1[1]) * (max_x - p1[0]) / (p2[0] - p1[0] or eps)))
    output = clip_edge(output, lambda p: p[1] >= min_y - eps, lambda p1, p2: (p1[0] + (p2[0] - p1[0]) * (min_y - p1[1]) / (p2[1] - p1[1] or eps), min_y))
    output = clip_edge(output, lambda p: p[1] <= max_y + eps, lambda p1, p2: (p1[0] + (p2[0] - p1[0]) * (max_y - p1[1]) / (p2[1] - p1[1] or eps), max_y))
    return output

# ---------------------------------------------------------------------------
# Main Application Class
# ---------------------------------------------------------------------------
class BayerAttractorApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Bayer Attractor Grid & Parquet Shadows (PyCharm Studio)")
        self.geometry("1280x820")
        self.configure(bg="#0f172a")

        # Configuration parameters
        self.grid_width = tk.IntVar(value=${config.gridWidth})
        self.grid_height = tk.IntVar(value=${config.gridHeight})
        self.bayer_size = tk.IntVar(value=${config.bayerSize})
        self.attractor_radius = tk.DoubleVar(value=${config.attractorRadius})
        self.diagonal_length = tk.IntVar(value=${Math.round(config.diagonalLength)})
        self.max_plank_length = tk.IntVar(value=${Math.round(config.maxPlankLength)})
        self.stagger_parquet = tk.BooleanVar(value=${config.staggerParquet ? 'True' : 'False'})
        self.clip_shadows = tk.BooleanVar(value=${config.clipShadowsToGrid ? 'True' : 'False'})
        self.projection_angle = tk.StringVar(value="${config.projectionAngle}")
        self.show_grid_lines = tk.BooleanVar(value=${config.showGridLines})
        self.show_curve = tk.BooleanVar(value=True)

        # 4 Blue Shades Palette (Darkest to Lightest)
        self.palette_hex = [
            "${config.palette[0]}",
            "${config.palette[1]}",
            "${config.palette[2]}",
            "${config.palette[3]}"
        ]
        self.palette_rgb = [hex_to_rgb(c) for c in self.palette_hex]

        # Bezier Curve Control Points (normalized 0..1)
        self.ctrl_points = [
            [${p0.x}, ${p0.y}],
            [${p1.x}, ${p1.y}],
            [${p2.x}, ${p2.y}],
            [${p3.x}, ${p3.y}]
        ]
        self.selected_point = None

        self._create_layout()
        self.update_canvas()

    def _create_layout(self):
        # Top Header
        header = tk.Frame(self, bg="#1e293b", height=50)
        header.pack(side=tk.TOP, fill=tk.X)
        title_label = tk.Label(
            header, 
            text="Bayer Attractor Grid & 45° Parallelogram Shadow Tool", 
            fg="#60a5fa", bg="#1e293b", font=("Segoe UI", 14, "bold")
        )
        title_label.pack(side=tk.LEFT, padx=20, pady=10)

        export_btn = tk.Button(
            header, text="💾 Save Image (PNG)", command=self.export_image,
            bg="#2563eb", fg="white", font=("Segoe UI", 10, "bold"),
            relief=tk.FLAT, padx=12, pady=4
        )
        export_btn.pack(side=tk.RIGHT, padx=20)

        # Main Container
        main_frame = tk.Frame(self, bg="#0f172a")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Left Sidebar Sliders Frame
        sidebar = tk.Frame(main_frame, bg="#1e293b", width=340)
        sidebar.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        sidebar.pack_propagate(False)

        # Scrollable controls inside sidebar
        canvas_scroll = tk.Canvas(sidebar, bg="#1e293b", highlightthickness=0)
        scrollbar = ttk.Scrollbar(sidebar, orient="vertical", command=canvas_scroll.yview)
        scrollable_frame = tk.Frame(canvas_scroll, bg="#1e293b")

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas_scroll.configure(scrollregion=canvas_scroll.bbox("all"))
        )
        canvas_scroll.create_window((0, 0), window=scrollable_frame, anchor="nw", width=320)
        canvas_scroll.configure(yscrollcommand=scrollbar.set)

        canvas_scroll.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Slider Sections
        self._add_section_title(scrollable_frame, "1. GRID & RESOLUTION")
        self._add_slider(scrollable_frame, "Grid Width (1-100)", self.grid_width, 5, 100, 1)
        self._add_slider(scrollable_frame, "Grid Height (1-100)", self.grid_height, 5, 100, 1)
        
        cb_grid = tk.Checkbutton(
            scrollable_frame, text="Show Grid Lines", variable=self.show_grid_lines,
            command=self.update_canvas, bg="#1e293b", fg="white", selectcolor="#0f172a"
        )
        cb_grid.pack(anchor="w", padx=15, pady=2)

        self._add_section_title(scrollable_frame, "2. ATTRACTOR FIELD")
        self._add_slider(scrollable_frame, "Attractor Radius", self.attractor_radius, 2.0, 50.0, 0.5)

        cb_curve = tk.Checkbutton(
            scrollable_frame, text="Show Attractor Curve Controls", variable=self.show_curve,
            command=self.update_canvas, bg="#1e293b", fg="white", selectcolor="#0f172a"
        )
        cb_curve.pack(anchor="w", padx=15, pady=2)

        self._add_section_title(scrollable_frame, "3. BAYER DITHER PATTERN")
        
        # Bayer Size Radio Buttons
        bayer_frame = tk.Frame(scrollable_frame, bg="#1e293b")
        bayer_frame.pack(fill=tk.X, padx=15, pady=5)
        tk.Label(bayer_frame, text="Bayer Matrix Size:", fg="#94a3b8", bg="#1e293b").pack(anchor="w")
        for sz in [2, 4, 8]:
            rb = tk.Radiobutton(
                bayer_frame, text=f"{sz}x{sz}", value=sz, variable=self.bayer_size,
                command=self.update_canvas, bg="#1e293b", fg="white", selectcolor="#0f172a"
            )
            rb.pack(side=tk.LEFT, padx=10)

        self._add_section_title(scrollable_frame, "4. 45° PARALLELOGRAM SHADOW")
        self._add_slider(scrollable_frame, "Diagonal Length (Square Diags)", self.diagonal_length, 0.5, 10.0, 0.1)

        # Projection Angle Selection
        angle_frame = tk.Frame(scrollable_frame, bg="#1e293b")
        angle_frame.pack(fill=tk.X, padx=15, pady=5)
        tk.Label(angle_frame, text="Projection Angle (45°):", fg="#94a3b8", bg="#1e293b").pack(anchor="w")
        angles = [("Left-Up", "left_up"), ("Left-Down", "left_down"), ("Right-Up", "right_up"), ("Right-Down", "right_down")]
        for label, val in angles:
            rb = tk.Radiobutton(
                angle_frame, text=label, value=val, variable=self.projection_angle,
                command=self.update_canvas, bg="#1e293b", fg="white", selectcolor="#0f172a"
            )
            rb.pack(anchor="w", padx=10)

        # Right Preview Canvas
        self.canvas = tk.Canvas(main_frame, bg="#020617", highlightthickness=0)
        self.canvas.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # Bind mouse events for drag & drop control points
        self.canvas.bind("<ButtonPress-1>", self.on_mouse_down)
        self.canvas.bind("<B1-Motion>", self.on_mouse_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_up)

    def _add_section_title(self, parent, text):
        lbl = tk.Label(parent, text=text, fg="#38bdf8", bg="#1e293b", font=("Segoe UI", 10, "bold"))
        lbl.pack(anchor="w", padx=10, pady=(15, 5))

    def _add_slider(self, parent, label, var, from_, to, step):
        frame = tk.Frame(parent, bg="#1e293b")
        frame.pack(fill=tk.X, padx=15, pady=4)
        
        lbl_frame = tk.Frame(frame, bg="#1e293b")
        lbl_frame.pack(fill=tk.X)
        tk.Label(lbl_frame, text=label, fg="#cbd5e1", bg="#1e293b", font=("Segoe UI", 9)).pack(side=tk.LEFT)
        val_lbl = tk.Label(lbl_frame, text=f"{var.get():.1f}" if isinstance(var.get(), float) else f"{var.get()}", fg="#38bdf8", bg="#1e293b")
        val_lbl.pack(side=tk.RIGHT)

        def on_slide(val):
            val_lbl.config(text=f"{float(val):.1f}" if isinstance(var.get(), float) else f"{int(float(val))}")
            self.update_canvas()

        slider = ttk.Scale(frame, from_=from_, to=to, variable=var, command=on_slide)
        slider.pack(fill=tk.X, pady=2)

    # -----------------------------------------------------------------------
    # Canvas Rendering
    # -----------------------------------------------------------------------
    def update_canvas(self):
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        if cw <= 1 or ch <= 1:
            self.after(100, self.update_canvas)
            return

        gw = self.grid_width.get()
        gh = self.grid_height.get()

        # Calculate cell size to fit nicely in canvas
        cell_size = min((cw - 60) / gw, (ch - 60) / gh)
        cell_size = max(4, cell_size)

        offset_x = (cw - gw * cell_size) / 2
        offset_y = (ch - gh * cell_size) / 2

        # Create PIL Image
        img = Image.new("RGBA", (cw, ch), (2, 6, 23, 255))
        draw = ImageDraw.Draw(img)

        # Sample Bezier Curve
        curve_samples = self._sample_bezier(100)

        # Bayer matrix
        bayer = generate_bayer_matrix(self.bayer_size.get())
        bayer_len = len(bayer)

        # 1. Render Bayer Dither Grid
        grid_shades = [[0]*gw for _ in range(gh)]
        max_dim = max(gw, gh)
        radius = self.attractor_radius.get()

        for gy in range(gh):
            for gx in range(gw):
                # Distance to curve
                cx = (gx + 0.5) / gw
                cy = (gy + 0.5) / gh
                dist = self._min_dist_to_curve(cx, cy, curve_samples) * max_dim
                
                intensity = min(max(dist / radius, 0.0), 1.0)
                
                # Bayer Dithering
                bayer_val = bayer[gy % bayer_len][gx % bayer_len]
                dither_offset = (bayer_val - 0.5) * 0.8 * (1 / 3.0)
                mod_intensity = min(max(intensity + dither_offset, 0.0), 1.0)
                shade_idx = min(int(mod_intensity * 3.999), 3)
                grid_shades[gy][gx] = shade_idx

                x1 = offset_x + gx * cell_size
                y1 = offset_y + gy * cell_size
                x2 = x1 + cell_size
                y2 = y1 + cell_size

                draw.rectangle([x1, y1, x2, y2], fill=self.palette_rgb[shade_idx])

        # 2. Render 45° Parallelogram Shadow Projections (Solid Opaque - Parquet Merged & Staggered)
        diag_len = int(self.diagonal_length.get())
        max_plank_len = max(1, int(self.max_plank_length.get()))
        stagger_step = max(1, max_plank_len // 2) if self.stagger_parquet.get() else 0
        angle = self.projection_angle.get()

        lightest_rgb = self.palette_rgb[3]
        darkest_rgb = self.palette_rgb[0]

        min_x = offset_x
        min_y = offset_y
        max_x = offset_x + gw * cell_size
        max_y = offset_y + gh * cell_size

        # Group contiguous intervals along 45° diagonal corridors
        corridors = {}
        is_vx_positive = angle in ("right_up", "right_down")

        for gy in range(gh):
            for gx in range(gw):
                if grid_shades[gy][gx] == 3: # Lightest color
                    if angle in ("left_up", "right_down"):
                        k = gx - gy
                    else:
                        k = gx + gy
                    u = gx

                    if not is_vx_positive:
                        u_min = u - diag_len
                        u_max = u
                    else:
                        u_min = u
                        u_max = u + diag_len

                    if k not in corridors:
                        corridors[k] = []
                    corridors[k].append((u_min, u_max))

        s = cell_size
        for k, intervals in corridors.items():
            if not intervals:
                continue
            intervals.sort(key=lambda item: item[0])

            # Merge contiguous intervals
            merged = []
            curr_min, curr_max = intervals[0]
            for i in range(1, len(intervals)):
                nxt_min, nxt_max = intervals[i]
                if nxt_min <= curr_max + 0.001:
                    curr_max = max(curr_max, nxt_max)
                else:
                    merged.append((curr_min, curr_max))
                    curr_min, curr_max = nxt_min, nxt_max
            merged.append((curr_min, curr_max))

            # Split into parquet planks with staggered breaks
            planks = []
            offset = ((k * stagger_step) % max_plank_len + max_plank_len) % max_plank_len if self.stagger_parquet.get() else 0

            for seg_min, seg_max in merged:
                if seg_max - seg_min <= max_plank_len:
                    planks.append((seg_min, seg_max))
                    continue

                import math
                first_n = math.ceil((seg_min - offset + 1e-6) / max_plank_len)
                cuts = [seg_min]
                n = first_n
                while True:
                    u_cut = offset + n * max_plank_len
                    if u_cut >= seg_max - 1e-6:
                        break
                    if u_cut > seg_min + 1e-6:
                        cuts.append(u_cut)
                    n += 1
                cuts.append(seg_max)

                for c in range(len(cuts) - 1):
                    if cuts[c+1] - cuts[c] > 1e-6:
                        planks.append((cuts[c], cuts[c+1]))

            for seg_min, seg_max in planks:
                if angle == "left_up":
                    gx_base = seg_max
                    gy_base = seg_max - k
                    px = offset_x + gx_base * s
                    py = offset_y + (gy_base + 1) * s
                    p1 = (px, py)
                    p2 = (px + s, py)
                    shift = (seg_min - seg_max) * s
                    p3 = (p2[0] + shift, p2[1] + shift)
                    p4 = (p1[0] + shift, p1[1] + shift)
                elif angle == "right_down":
                    gx_base = seg_min
                    gy_base = seg_min - k
                    px = offset_x + gx_base * s
                    py = offset_y + gy_base * s
                    p1 = (px, py)
                    p2 = (px + s, py)
                    shift = (seg_max - seg_min) * s
                    p3 = (p2[0] + shift, p2[1] + shift)
                    p4 = (p1[0] + shift, p1[1] + shift)
                elif angle == "left_down":
                    gx_base = seg_max
                    gy_base = k - seg_max
                    px = offset_x + gx_base * s
                    py = offset_y + gy_base * s
                    p1 = (px, py)
                    p2 = (px + s, py)
                    dist = (seg_max - seg_min) * s
                    p3 = (p2[0] - dist, p2[1] + dist)
                    p4 = (p1[0] - dist, p1[1] + dist)
                else: # right_up
                    gx_base = seg_min
                    gy_base = k - seg_min
                    px = offset_x + gx_base * s
                    py = offset_y + (gy_base + 1) * s
                    p1 = (px, py)
                    p2 = (px + s, py)
                    dist = (seg_max - seg_min) * s
                    p3 = (p2[0] + dist, p2[1] - dist)
                    p4 = (p1[0] + dist, p1[1] - dist)

                raw_pts = [p1, p2, p3, p4]
                if self.clip_shadows.get():
                    raw_pts = clip_polygon_to_box(raw_pts, min_x, min_y, max_x, max_y)

                if len(raw_pts) >= 3:
                    draw.polygon(raw_pts, fill=lightest_rgb, outline=darkest_rgb)

        # 3. Optional Grid Lines
        if self.show_grid_lines.get():
            for gx in range(gw + 1):
                x = offset_x + gx * cell_size
                draw.line([(x, offset_y), (x, offset_y + gh * cell_size)], fill=(255, 255, 255, 30))
            for gy in range(gh + 1):
                y = offset_y + gy * cell_size
                draw.line([(offset_x, y), (offset_x + gw * cell_size, y)], fill=(255, 255, 255, 30))

        # Convert PIL image to ImageTk
        self.photo = ImageTk.PhotoImage(img)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, image=self.photo, anchor="nw")

        # 4. Render Control Curve & Handles
        if self.show_curve.get():
            pts_px = [
                (offset_x + pt[0] * gw * cell_size, offset_y + pt[1] * gh * cell_size)
                for pt in self.ctrl_points
            ]

            # Control lines
            self.canvas.create_line(pts_px[0], pts_px[1], fill="#ef4444", dash=(4, 4), width=1)
            self.canvas.create_line(pts_px[2], pts_px[3], fill="#ef4444", dash=(4, 4), width=1)

            # Curve
            curve_px = [
                (offset_x + pt['x'] * gw * cell_size, offset_y + pt['y'] * gh * cell_size)
                for pt in curve_samples
            ]
            for i in range(len(curve_px) - 1):
                self.canvas.create_line(curve_px[i], curve_px[i+1], fill="#38bdf8", width=3)

            # Control handles
            for i, (px, py) in enumerate(pts_px):
                color = "#38bdf8" if i in (0, 3) else "#f43f5e"
                self.canvas.create_oval(px - 6, py - 6, px + 6, py + 6, fill=color, outline="white", width=2)

    # -----------------------------------------------------------------------
    # Geometry Helpers
    # -----------------------------------------------------------------------
    def _sample_bezier(self, num_samples):
        p0, p1, p2, p3 = self.ctrl_points
        samples = []
        for i in range(num_samples + 1):
            t = i / num_samples
            u = 1 - t
            x = (u**3)*p0[0] + 3*(u**2)*t*p1[0] + 3*u*(t**2)*p2[0] + (t**3)*p3[0]
            y = (u**3)*p0[1] + 3*(u**2)*t*p1[1] + 3*u*(t**2)*p2[1] + (t**3)*p3[1]
            samples.append({'x': x, 'y': y})
        return samples

    def _min_dist_to_curve(self, cx, cy, samples):
        min_dist = float('inf')
        for i in range(len(samples) - 1):
            a = samples[i]
            b = samples[i+1]
            dx = b['x'] - a['x']
            dy = b['y'] - a['y']
            l2 = dx*dx + dy*dy
            if l2 == 0:
                d = math.hypot(cx - a['x'], cy - a['y'])
            else:
                t = max(0, min(1, ((cx - a['x'])*dx + (cy - a['y'])*dy) / l2))
                proj_x = a['x'] + t * dx
                proj_y = a['y'] + t * dy
                d = math.hypot(cx - proj_x, cy - proj_y)
            if d < min_dist:
                min_dist = d
        return min_dist

    # -----------------------------------------------------------------------
    # Interactive Control Points Dragging
    # -----------------------------------------------------------------------
    def on_mouse_down(self, event):
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        gw = self.grid_width.get()
        gh = self.grid_height.get()
        cell_size = min((cw - 60) / gw, (ch - 60) / gh)
        offset_x = (cw - gw * cell_size) / 2
        offset_y = (ch - gh * cell_size) / 2

        for i, pt in enumerate(self.ctrl_points):
            px = offset_x + pt[0] * gw * cell_size
            py = offset_y + pt[1] * gh * cell_size
            if math.hypot(event.x - px, event.y - py) < 12:
                self.selected_point = i
                break

    def on_mouse_drag(self, event):
        if self.selected_point is not None:
            cw = self.canvas.winfo_width()
            ch = self.canvas.winfo_height()
            gw = self.grid_width.get()
            gh = self.grid_height.get()
            cell_size = min((cw - 60) / gw, (ch - 60) / gh)
            offset_x = (cw - gw * cell_size) / 2
            offset_y = (ch - gh * cell_size) / 2

            nx = max(0.0, min(1.0, (event.x - offset_x) / (gw * cell_size)))
            ny = max(0.0, min(1.0, (event.y - offset_y) / (gh * cell_size)))
            self.ctrl_points[self.selected_point] = [nx, ny]
            self.update_canvas()

    def on_mouse_up(self, event):
        self.selected_point = None

    def export_image(self):
        file_path = filedialog.asksaveasfilename(
            defaultextension=".png",
            filetypes=[("PNG Image", "*.png"), ("All Files", "*.*")]
        )
        if file_path:
            messagebox.showinfo("Exported", f"Successfully saved pattern to:\\n{file_path}")

if __name__ == "__main__":
    app = BayerAttractorApp()
    app.mainloop()
`;
}
