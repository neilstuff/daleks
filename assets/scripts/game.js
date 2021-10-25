Daleks.GameController = (function() {
    "use strict";

    var _click = "click";

    var painterClasses = {
        doctor: [{
            className: "doctor",
            frames: 4
        }],
        dalek: [{
            className: "dalek",
            frames: 8
        }],
        collision: [{
                className: "dalek-dead-1",
                frames: 1
            },
            {
                className: "dalek-dead-2",
                frames: 1
            },
            {
                className: "dalek-dead-3",
                frames: 1
            },
            {
                className: "dalek-dead-4",
                frames: 1
            }
        ],
        rubble: [{
            className: "rubble",
            frames: 4
        }],
        dead: [{
            className: "dead",
            frames: 8
        }]
    }

    function GameController(canvas) {
        this.board = new Daleks.Board(30, 20);
        this.gameData = new Daleks.GameData();

        canvas.append(this.board.getEl());

        this.resetGame();

        $(".arena").on("click", function() {
            $(".instructions").addClass("fadeOut");
        });
    }

    GameController.prototype = {

        // create N daleks, and a player, add them to the board
        // start event listeners, wait for input, then move and deal
        startNextLevel: function() {
            this.level++;
            this.screwdriversLeft = 1;
            this.roundOver = false;
            this.board.clear();
            this.isAnimating = false;

            //           this.doctor = new Daleks.Piece(painterClasses['doctor']);
            this.doctor = new Daleks.Piece(painterClasses['doctor']);
            this.collision = new Daleks.Piece(painterClasses['collision'], {
                interval: 100
            });

            this.controls = new Daleks.DoctorControls(
                this.board, {
                    fn: this.handleMove,
                    scope: this
                });

            this.restoreControls();

            this.board.placeDoctor(this.doctor);

            this.rubble = [];
            this.daleks = [];
            for (var i = 0; i < 5 * this.level; i++) {
                this.daleks[i] = new Daleks.Piece(painterClasses['dalek']);
                this.board.placeDalek(this.daleks[i], this.doctor);
            }

            this.draw();
        },

        // callback for an arrow being clicked or other move instruction
        handleMove: function(dir) {
            this.controls.moveDoctor(this.doctor, dir);
            this.updateWorld();
        },

        // Update the css for all element
        draw: function() {
            for (var iRubble in this.rubble) {
                this.rubble[iRubble].draw();
            }

            this.updateControls(); // draws controls as well

        },

        //----------------------------------------
        // enable buttons and keyboard event handlers
        enableControls: function() {
            this.disableControls(); // make sure no handler leaks
            var self = this;
            $(".button").removeClass("disabled");

            $("body").on("keydown",
                function(e) {
                    switch (e.which) {
                        case 76:
                            self.lastStand();
                            break;
                        case 83:
                            self.sonicScrewDriver();
                            break;
                        case 84:
                            self.teleport();
                            break;
                    }
                });

            // data-name is the function to call on click
            $(".actions").on(_click, "a", function(e) {
                e.preventDefault();
                var fn = $(e.target).closest('a').data('name');
                if (self[fn]) {
                    self[fn].call(self);
                }
                return false;
            });

            this.updateScrewDriver();
        },

        disableControls: function() {

            this.controls.disable();

            $("body").off("keydown");
            $(".actions").off(_click, "a");
            $(".button").addClass("disabled");

        },

        //----------------------------------------
        // place the control arrows in legal places
        // Take into acconut things to block arrows: daleks, borders, rubble
        updateControls: function() {
            if (!this.isLastStand) {
                this.controls.update(this.doctor, this.board,
                    this.daleks.concat(this.rubble));
            }
        },

        // @return true of any daleks or the doctor are an in-progress animation
        animationInProgress: function() {
            for (var dalek in this.daleks) {
                if (this.daleks[dalek].isAnimating) {
                    return true;
                }
            }

            return this.doctor.isAnimating || this.isAnimating;
        },

        //----------------------------------------
        // the doctor made a move, respond
        updateWorld: function() {

            var self = this;
            var tryAgain = function() {
                self.updateWorld();
            };

            // Wait until doctor has moved
            if (this.animationInProgress()) {
                setTimeout(tryAgain, 100);
                return;
            }

            this.moveDaleks();
            this.checkWorld();
        },

        checkWorld: function() {

            // can this logic be centralized (checkConditionAndTryAgain() )
            var self = this;
            var tryAgain = function() {
                self.checkWorld();
            };

            // wait until animations done
            if (this.animationInProgress()) {
                setTimeout(tryAgain, 100);
                return;
            }

            this.checkCollisions(); // TODO remove pieces after animation is complete

            if (!this.roundOver) {
                this.draw();
            }

            // check for victory
            var victory = true;
            for (var iDalek in this.daleks) {
                if (this.daleks[iDalek]) {
                    victory = false;
                    break;
                }
            }

            if (victory) {
                this.winRound();
            }

            // keep going until round over
            if (!this.roundOver && this.isLastStand) {
                this.updateWorld();
            }
        },

        //----------------------------------------
        moveDaleks: function() {
            for (var iDalek in this.daleks) { // not a for loop beacuse this array is sparse
                var dalek = this.daleks[iDalek];
                dalek.moveTowards(this.doctor);
            }
        },

        //----------------------------------------
        // did this dalek run into the Doctor or rubble?
        checkObjectCollision: function(dalek) {

            if (dalek.collidedWith(this.doctor)) {
                this.board.remove(dalek);
                this.loseGame();

                return {
                    type: 1,
                    object: this.doctor
                };

            }

            for (var iRubble in this.rubble) {
                if (dalek.collidedWith(this.rubble[iRubble])) {
                    return {
                        type: 2,
                        object: this.rubble[iRubble],
                        index: iRubble
                    };

                }

            }

            for (var iDalek in this.daleks) {

                if (dalek.collidedWith(this.daleks[iDalek])) { 
                    return {
                        type: 3,
                        object: this.daleks[iDalek],
                        index: iDalek
                    };

                }

            }    

            return  {
                type:0
            };

        },

        //----------------------------------------
        // make rubble where Daleks impacted each other
        // check for impact with existing landmarks first, 
        // then with other daleks - which will make a landmark for others to hit
        checkCollisions: function() {
            for (var iDalek in this.daleks) {

               var result = this.checkObjectCollision(this.daleks[iDalek]);

               if (result.type == 1) {
                    this.board.remove(this.daleks[iDalek]);
                    this.loseGame();
               } else if (result.type == 2) {
                    var rubble = result.object;
 
                    rubble.hide();

                    this.board.placeCollision(this.collision, this.daleks[iDalek].pos);
                    this.collision.setPosition(this.daleks[iDalek].pos);
                    this.collision.show();

                    this.collision.animate({
                            rubble: rubble
                        },
                        function(piece, args) {

                            piece.hide();
                            args.rubble.show();

                        });

                    this.removeDalek(iDalek);

                    continue;

                } else if (result.type == 3) {

                    this.board.placeCollision(this.collision, this.daleks[iDalek].pos);
                    this.collision.setPosition(this.daleks[iDalek].pos);

                    this.collision.show();

                    var rubble = new Daleks.Piece(painterClasses['rubble']);
                    this.board.placeRubble(rubble, this.daleks[iDalek].pos);

                    rubble.hide();

                    this.rubble[this.rubble.length] = rubble;

                    this.collision.animate({
                            rubble: rubble
                        },
                        function(piece, args) {

                            piece.hide();
                            args.rubble.show();

                        });

                    this.removeDalek(iDalek);
                    this.removeDalek(result.index);

                    break;

                }

            }

        },

        //----------------------------------------
        removeDalek: function(index) {
            this.board.remove(this.daleks[index]);
            delete this.daleks[index];
            this.updateScore(1);
        },

        updateScore: function(value) {
            this.score += value;
            $("#score").text(this.score);
        },


        //----------------------------------------
        // randomly jump doctor, no guarantee of landing place
        teleport: function() {
            this.isAnimating = true;

            this.disableControls();

            var epicenter = this.doctor.getScaledCenterPos();

            this.board.remove(this.doctor);

            var disappear = new Daleks.Animation.SonicPulse({
                container: this.board.getEl(),
                epicenter: epicenter,
                innerDiameter: 48,
                outerDiameter: 480,
                callback: {
                    success: this.teleportReappear,
                    context: this
                }
            });

            disappear.start();
        },

        //----------------------------------------
        // reppear after disappear is done
        teleportReappear: function() {

            // someplace brand new!
            this.board.placeDoctor(this.doctor);
            var epicenter = this.doctor.getScaledCenterPos();

            // depends on being called with "this" as context
            var reappearDone = function() {
                this.doneAnimating();
                this.enableControls();
                this.updateWorld();
            };

            var reappear = new Daleks.Animation.SonicPulse({
                container: this.board.getEl(),
                epicenter: epicenter,
                innerDiameter: 48,
                outerDiameter: 480,
                reverse: true,
                callback: {
                    success: reappearDone,
                    context: this
                }
            });

            reappear.start();
        },

        doneAnimating: function() {
            this.isAnimating = false;
        },

        //----------------------------------------
        // move Daleks inexorably towards the Doctor
        lastStand: function() {
            this.isLastStand = true;
            this.controls.disable();
            this.disableControls();
            $(".button").addClass("disabled");;

            this.updateWorld();
        },

        // oops! User didn't mean to last stand, cancel it.
        restoreControls: function() {
            this.isLastStand = false;
            this.enableControls();
        },

        // hide screw driver button if used
        updateScrewDriver: function() {
            if (this.screwdriversLeft <= 0) {
                $(".button[data-name=sonicScrewDriver]").addClass("disabled");
            }
        },

        //----------------------------------------
        // kill the nearest daleks and continue
        sonicScrewDriver: function() {

            if (this.screwdriversLeft <= 0) {
                return;
            }

            this.screwdriversLeft--;
            this.updateScrewDriver();

            var x = this.doctor.pos.x;
            var y = this.doctor.pos.y;

            var epicenter = this.doctor.getScaledCenterPos();
            var animation = new Daleks.Animation.SonicPulse({
                container: this.board.getEl(),
                epicenter: epicenter,
                innerDiameter: 16,
                outerDiameter: 48
            });

            animation.start();
            for (var i in this.daleks) {
                var pos = this.daleks[i].pos;
                if (((pos.x === x) || (pos.x === x + 1) || (pos.x === x - 1)) &&
                    ((pos.y === y) || (pos.y === y + 1) || (pos.y === y - 1))) {
                    this.removeDalek(i);
                }
            }

            this.updateWorld();
        },

        //----------------------------------------
        winRound: function() {
            this.endRound();

            $(".victory").show();

            var self = this;
            $(".arena").one(_click, function() {
                self.startNextLevel();
                return false;
            });
        },

        //----------------------------------------
        loseGame: function() {
            this.endRound();

            // TODO animate

            console.log(this.doctor.getEl());

            this.doctor.getEl().addClass("dead");

            this.gameData.setHighScore(this.score);
            
            //           $("#highScore").text(this.gameData.getHighScore());
            //            $("#highScores").show();

            var self = this;
            
            $(".arena").one(_click, function() {
                self.resetGame();
                self.startNextLevel();
                return false;
            });

        },

        //----------------------------------------
        endRound: function() {
            this.roundOver = true;
            this.restoreControls(); // reset to normal state (ex: panic button)
            this.disableControls();
        },

        resetGame: function() {
            this.score = 0;
            this.level = 0;
        }
    };

    return GameController;
})();

$(() => {
    var game = new Daleks.GameController($(".arena"));

    window.addEventListener("mousedown", event => {

        if (event.target.classList && event.target.classList.contains('drop_menu_item')) {
            var id = event.target.innerText.trimStart().toLowerCase();

            $(`#${id}`).css('display', 'block');

            event.target.style.backgroundColor = 'black';
            event.target.style.color = 'white';

        }

    });

    window.addEventListener("mouseup", event => {

        var items = document.getElementsByClassName('drop_menu_item');

        for (var item in items) {
            if (items[item].innerText) {
                var id = items[item].innerText.trimStart().toLowerCase();

                $(`#${id}`).css('display', 'none');

                items[item].style.backgroundColor = 'white';
                items[item].style.color = 'black';
            }

        }

        if (event.target.id && event.target.id == 'quit') {
            window.api.quit();
        } else if (event.target.id && event.target.id == 'teleport') {
            game.teleport();
        } else if (event.target.id && event.target.id == 'laststand') {
            game.lastStand();
        } else if (event.target.id && event.target.id == 'screwdriver') {
            game.sonicScrewDriver();
        } else if (event.target.id && event.target.id == 'giveup') {
            game.resetGame();
            game.startNextLevel();
        }

    });

    game.startNextLevel();

});