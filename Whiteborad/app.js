
class DrawingBoard {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.color = '#000000';
        this.brushSize = 5;
        this.opacity = 1;
        this.paths = [];
        this.undoStack = [];
        this.redoStack = [];
        
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // 触摸屏支持
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', () => {
            const mouseEvent = new MouseEvent('mouseup');
            this.canvas.dispatchEvent(mouseEvent);
        });

        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.redraw();
        });
    }

    setupToolbar() {
        // 工具按钮
        document.getElementById('pencil').addEventListener('click', () => this.setTool('pencil'));
        document.getElementById('eraser').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('clear').addEventListener('click', () => this.clearCanvas());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());
        document.getElementById('save').addEventListener('click', () => this.saveCanvas());

        // 属性控制
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.color = e.target.value;
        });

        const brushSizeInput = document.getElementById('brushSize');
        brushSizeInput.addEventListener('input', (e) => {
            this.brushSize = e.target.value;
            document.getElementById('brushSizeValue').textContent = `${this.brushSize}px`;
        });

        const opacityInput = document.getElementById('opacity');
        opacityInput.addEventListener('input', (e) => {
            this.opacity = e.target.value / 100;
            document.getElementById('opacityValue').textContent = `${e.target.value}%`;
        });

        // 按钮激活状态
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        if (tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
        }
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.currentPath = {
            tool: this.currentTool,
            color: this.color,
            size: this.brushSize,
            opacity: this.opacity,
            points: []
        };
        
        const point = this.getMousePosition(e);
        this.currentPath.points.push(point);
        this.drawPoint(point);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const point = this.getMousePosition(e);
        this.currentPath.points.push(point);
        
        if (this.currentPath.points.length > 1) {
            const prevPoint = this.currentPath.points[this.currentPath.points.length - 2];
            this.drawLine(prevPoint, point);
        } else {
            this.drawPoint(point);
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (this.currentPath.points.length > 0) {
            this.paths.push(this.currentPath);
            this.redoStack = []; // 清空重做栈
        }
    }

    drawPoint(point) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, this.brushSize / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.currentTool === 'eraser' ? 'rgba(0,0,0,1)' : this.color;
        this.ctx.globalAlpha = this.opacity;
        this.ctx.fill();
    }

    drawLine(start, end) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? 'rgba(0,0,0,1)' : this.color;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.globalAlpha = this.opacity;
        this.ctx.stroke();
    }

    getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.paths.forEach(path => {
            this.ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
            this.ctx.strokeStyle = path.color;
            this.ctx.fillStyle = path.color;
            this.ctx.lineWidth = path.size;
            this.ctx.globalAlpha = path.opacity;
            
            if (path.points.length > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(path.points[0].x, path.points[0].y);
                
                for (let i = 1; i < path.points.length; i++) {
                    this.ctx.lineTo(path.points[i].x, path.points[i].y);
                }
                
                this.ctx.stroke();
            }
        });
    }

    clearCanvas() {
        this.paths = [];
        this.undoStack = [];
        this.redoStack = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    undo() {
        if (this.paths.length === 0) return;
        
        const lastPath = this.paths.pop();
        this.undoStack.push(lastPath);
        this.redraw();
    }

    redo() {
        if (this.undoStack.length === 0) return;
        
        const lastUndo = this.undoStack.pop();
        this.paths.push(lastUndo);
        this.redraw();
    }

    saveCanvas() {
        const dataURL = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'whiteboard-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = dataURL;
        link.click();
    }
}

// 初始化白板
document.addEventListener('DOMContentLoaded', () => {
    new DrawingBoard();
});
