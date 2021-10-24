// require("daleks.js");

//----------------------------------------------------------------------
// A Piece occupies a space on the board that no one else can occupy.
// args = {
//    size: in pixels of piece (should match css)
//   offset: offset in pixels to draw this piece
//----------------------------------------------------------------------
Daleks.Piece = (function() {

    function Piece(sprites, args) {
        this.frames = [];

        for (var iSprite in sprites) {

            for (var iFrame = 0; iFrame < sprites[iSprite].frames; iFrame++) {

                this.frames.push(sprites[iSprite].className);
                console.log(sprites[iSprite].className);

            }

        }


        args = args || {};

        this.pos = { x: 0, y: 0 };
        this.size = args.size || 16;
        this.interval = args.interval || 40;

        this.offset = args.offset || 0;
        this.isAnimating = false;
        this.frameCount = this.frames.length;

        this.el = $(`<div class="piece"/>`);

    }

    Piece.prototype = {

        getEl: function() { return this.el; },

        // deep copy new position
        setPosition: function(pos) {
            this.pos.x = pos.x;
            this.pos.y = pos.y;
        },

        // center point of piece on screen in pixels
        getScaledCenterPos: function() {
            var pos = this.getScaledPos(this.pos);
            pos.x = pos.x + this.size / 2;
            pos.y = pos.y + this.size / 2;
            return pos;
        },

        getScaledPos: function(pos) {
            return {
                x: pos.x * this.size,
                y: pos.y * this.size
            };
        },

        // a Piece finished animating.  now what?  
        finishAnimation: function(args, callback) {
            this.isAnimating = false;
            var self = this;

            if (callback) {
                callback(self, args);
            }
        },

        //----------------------------------------
        // move smoothly from one point to another
        // this is done asynchronously and ends when "to" point is reached.
        animateTo: function(toPos, args, callback) {
            this.isAnimating = true;

            var start = this.getScaledPos(this.pos);
            var end = this.getScaledPos(toPos);

            var interval = {
                x: end.x - start.x,
                y: end.y - start.y
            };

            var self = this;
            var frame = 1;

            var nextFrame = function() {
                self.paint(frame - 1, {
                    x: start.x + (interval.x / self.frameCount) * frame,
                    y: start.y + (interval.y / self.frameCount) * frame
                });

                if (++frame <= self.frameCount) {
                    setTimeout(nextFrame, self.interval);
                } else {
                    self.finishAnimation(args, callback);
                }
            };

            nextFrame.call();

        },

        animate: function(args, callback) {

            console.log(callback);

            this.isAnimating = true;

            var pos = this.getScaledPos(this.pos);
            var self = this;
            var frame = 1;

            var nextFrame = function() {
                self.paint(frame - 1, pos);

                console.log(self.frameCount, `${self.frames[frame - 1]}`, frame, pos);
                if (++frame <= self.frameCount) {
                    setTimeout(nextFrame, self.interval);
                } else {
                    self.finishAnimation(args, callback);
                }
            };
            nextFrame.call();
        },

        draw: function() {
            this.paint(0, this.getScaledPos(this.pos));
        },

        paint: function(frame, pos) {

            this.el.attr('class', `piece ${this.frames[frame]}`);
            this.el.css('left', pos.x - this.offset);
            this.el.css('bottom', pos.y - this.offset);

        },

        //----------------------------------------
        // move piece one towards given location (the Doctor)
        moveTowards: function(dest) {
            var to = { // deep copy
                x: this.pos.x,
                y: this.pos.y
            };

            if (this.pos.x > dest.pos.x) { to.x--; }
            if (this.pos.x < dest.pos.x) { to.x++; }
            if (this.pos.y > dest.pos.y) { to.y--; }
            if (this.pos.y < dest.pos.y) { to.y++; }

            this.slideTo(to);
        },

        //----------------------------------------
        // update logical position, and animate a transition to there on screen
        slideTo: function(newPos) {
            // start animation first (perhaps set should be a after-callback?
            this.animateTo(newPos);

            this.setPosition(newPos);
        },

        // @return true if two distinct pieces are in the same place 
        //              (and not identical)
        collidedWith: function(target) {
            return (this != target) &&
                (this.pos.x === target.pos.x) &&
                (this.pos.y === target.pos.y);
        },

        hide: function() {
            this.getEl().css("display", "none");
        },
        show: function() {
            this.getEl().css("display", "inherit");
        }

    };

    return Piece;

})();